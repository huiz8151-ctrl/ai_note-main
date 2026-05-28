from __future__ import annotations

import json
import math
import re
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[2]
DEFAULT_KNOWLEDGE_DIR = ROOT / "exports" / "knowledge"
DEFAULT_INDEX_DIR = ROOT / "exports" / "knowledge_index"
DEFAULT_INDEX_PATH = DEFAULT_INDEX_DIR / "knowledge_index.json"
WORD_PATTERN = re.compile(r"[a-z0-9]+", re.IGNORECASE)
CJK_PATTERN = re.compile(r"[\u3400-\u9fff]+")
MARKDOWN_SEGMENT_PATTERN = re.compile(
    r"^\*\*\[(?P<start>[^\]]+)\s+→\s+(?P<end>[^\]]+)\]\*\*$"
)
TRANSCRIPT_LINE_PATTERN = re.compile(r"^\[(?P<start>[^\]]+)\]\s*(?:(?:[^:]+):\s*)?(?P<text>.+)$")


def trim_string(value: Any) -> str:
    return str(value or "").strip()


def compact_key(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", trim_string(value).lower())


def parse_timestamp(value: str) -> float:
    parts = [part for part in trim_string(value).split(":") if part]
    if not parts:
        return 0.0

    try:
        numbers = [float(part) for part in parts]
    except ValueError:
        return 0.0

    if len(numbers) == 3:
        return numbers[0] * 3600 + numbers[1] * 60 + numbers[2]

    if len(numbers) == 2:
        return numbers[0] * 60 + numbers[1]

    return numbers[0]


def normalize_text(value: str) -> str:
    return " ".join(trim_string(value).lower().split())


def tokenize_text(value: str) -> list[str]:
    normalized = normalize_text(value)
    if not normalized:
        return []

    tokens: list[str] = []
    tokens.extend(WORD_PATTERN.findall(normalized))

    for match in CJK_PATTERN.findall(normalized):
        if len(match) == 1:
            tokens.append(match)
            continue

        tokens.extend(match[index : index + 2] for index in range(len(match) - 1))
        if len(match) > 2:
            tokens.extend(match[index : index + 3] for index in range(len(match) - 2))

    collapsed = re.sub(r"\s+", "", normalized)
    ascii_collapsed = re.sub(r"[^a-z0-9\u3400-\u9fff]", "", collapsed)
    if len(ascii_collapsed) > 3:
        tokens.extend(
            ascii_collapsed[index : index + 3]
            for index in range(len(ascii_collapsed) - 2)
        )

    return [token for token in tokens if token]


def sparse_cosine_similarity(
    left: dict[str, float],
    right: dict[str, float],
    left_norm: float,
    right_norm: float,
) -> float:
    if not left or not right or left_norm <= 0 or right_norm <= 0:
        return 0.0

    if len(left) > len(right):
        left, right = right, left

    dot_product = 0.0
    for token, weight in left.items():
        dot_product += weight * right.get(token, 0.0)

    if dot_product <= 0:
        return 0.0

    return dot_product / (left_norm * right_norm)


class KnowledgeRagService:
    def __init__(
        self,
        knowledge_dir: Path | None = None,
        index_path: Path | None = None,
    ) -> None:
        self.knowledge_dir = knowledge_dir or DEFAULT_KNOWLEDGE_DIR
        self.index_path = index_path or DEFAULT_INDEX_PATH
        self.index_dir = self.index_path.parent
        self._state: dict[str, Any] = self._empty_state()
        self._load_or_initialize()

    def _empty_state(self) -> dict[str, Any]:
        return {
            "version": 1,
            "builtAt": "",
            "documents": [],
            "chunks": [],
        }

    def _load_or_initialize(self) -> None:
        self.index_dir.mkdir(parents=True, exist_ok=True)
        if not self.index_path.exists():
            self._state = self._empty_state()
            return

        try:
            data = json.loads(self.index_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            self._state = self._empty_state()
            return

        if not isinstance(data, dict):
            self._state = self._empty_state()
            return

        documents = data.get("documents") if isinstance(data.get("documents"), list) else []
        chunks = data.get("chunks") if isinstance(data.get("chunks"), list) else []
        self._state = {
            "version": 1,
            "builtAt": trim_string(data.get("builtAt")),
            "documents": documents,
            "chunks": chunks,
        }

    def status(self) -> dict[str, Any]:
        return {
            "ready": True,
            "builtAt": self._state.get("builtAt") or None,
            "knowledgeDir": str(self.knowledge_dir),
            "indexPath": str(self.index_path),
            "documentCount": len(self._state.get("documents", [])),
            "chunkCount": len(self._state.get("chunks", [])),
        }

    def rebuild(self) -> dict[str, Any]:
        documents = self._load_documents_from_disk()
        self._rebuild_from_documents(documents)
        self._save_state()
        return self.status()

    def upsert_document(
        self,
        *,
        video_name: str,
        markdown_path: str = "",
        source_path: str = "",
        language: str = "",
        model: str = "",
        segments: list[dict[str, Any]] | None = None,
        text: str = "",
    ) -> dict[str, Any]:
        document = self._build_document_from_payload(
            video_name=video_name,
            markdown_path=markdown_path,
            source_path=source_path,
            language=language,
            model=model,
            segments=segments or [],
            text=text,
        )

        if not document["chunks"]:
            raise ValueError("知识文档缺少可索引的文本块。")

        documents = [item for item in self._state.get("documents", []) if item.get("docId") != document["docId"]]
        documents.append(document)
        documents.sort(key=lambda item: (item.get("videoName") or "", item.get("docId") or ""))
        self._rebuild_from_documents(documents)
        self._save_state()
        return {
            **self.status(),
            "indexedDocId": document["docId"],
        }

    def search(
        self,
        *,
        query: str,
        top_k: int = 5,
        language: str = "",
        doc_ids: list[str] | None = None,
    ) -> dict[str, Any]:
        normalized_query = trim_string(query)
        if not normalized_query:
            raise ValueError("查询内容不能为空。")

        query_vector, query_norm = self._build_query_vector(normalized_query)
        if not query_vector or query_norm <= 0:
            return {
                "query": normalized_query,
                "results": [],
                "topK": max(1, int(top_k or 5)),
            }

        requested_language = trim_string(language).lower()
        requested_docs = {trim_string(item) for item in (doc_ids or []) if trim_string(item)}
        ranked_results: list[dict[str, Any]] = []

        for chunk in self._state.get("chunks", []):
            if requested_language and trim_string(chunk.get("language")).lower() not in {
                requested_language,
                "auto",
                "",
            }:
                continue

            if requested_docs and trim_string(chunk.get("docId")) not in requested_docs:
                continue

            chunk_vector = chunk.get("vector") if isinstance(chunk.get("vector"), dict) else {}
            chunk_norm = float(chunk.get("norm") or 0.0)
            score = sparse_cosine_similarity(query_vector, chunk_vector, query_norm, chunk_norm)
            if score <= 0:
                continue

            ranked_results.append(
                {
                    "chunkId": trim_string(chunk.get("chunkId")),
                    "docId": trim_string(chunk.get("docId")),
                    "videoName": trim_string(chunk.get("videoName")),
                    "sourcePath": trim_string(chunk.get("sourcePath")),
                    "markdownPath": trim_string(chunk.get("markdownPath")),
                    "language": trim_string(chunk.get("language")) or "auto",
                    "model": trim_string(chunk.get("model")),
                    "start": float(chunk.get("start") or 0.0),
                    "end": float(chunk.get("end") or 0.0),
                    "text": trim_string(chunk.get("text")),
                    "score": round(score, 6),
                }
            )

        ranked_results.sort(key=lambda item: item["score"], reverse=True)
        limited_results = ranked_results[: max(1, int(top_k or 5))]
        return {
            "query": normalized_query,
            "results": limited_results,
            "topK": max(1, int(top_k or 5)),
        }

    def _save_state(self) -> None:
        self.index_dir.mkdir(parents=True, exist_ok=True)
        self.index_path.write_text(
            json.dumps(self._state, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

    def _rebuild_from_documents(self, documents: list[dict[str, Any]]) -> None:
        chunk_payloads: list[dict[str, Any]] = []
        document_frequency: Counter[str] = Counter()

        for document in documents:
            raw_chunks = document.get("chunks") if isinstance(document.get("chunks"), list) else []
            normalized_chunks: list[dict[str, Any]] = []
            for index, chunk in enumerate(raw_chunks):
                text = trim_string(chunk.get("text"))
                if not text:
                    continue

                tokens = tokenize_text(text)
                if not tokens:
                    continue

                counts = Counter(tokens)
                normalized_chunk = {
                    "chunkId": trim_string(chunk.get("chunkId")) or f"{document['docId']}:chunk:{index}",
                    "docId": document["docId"],
                    "videoName": document.get("videoName") or "",
                    "sourcePath": document.get("sourcePath") or "",
                    "markdownPath": document.get("markdownPath") or "",
                    "language": document.get("language") or "auto",
                    "model": document.get("model") or "",
                    "start": float(chunk.get("start") or 0.0),
                    "end": float(chunk.get("end") or chunk.get("start") or 0.0),
                    "text": text,
                    "counts": dict(counts),
                }
                normalized_chunks.append(normalized_chunk)
                document_frequency.update(counts.keys())

            document["chunks"] = [
                {
                    "chunkId": item["chunkId"],
                    "start": item["start"],
                    "end": item["end"],
                    "text": item["text"],
                }
                for item in normalized_chunks
            ]
            chunk_payloads.extend(normalized_chunks)

        total_chunks = max(1, len(chunk_payloads))
        serialized_chunks: list[dict[str, Any]] = []

        for chunk in chunk_payloads:
            counts = Counter(chunk.pop("counts", {}))
            vector: dict[str, float] = {}
            total_terms = sum(counts.values()) or 1

            for token, count in counts.items():
                idf = math.log((1 + total_chunks) / (1 + document_frequency[token])) + 1.0
                vector[token] = (count / total_terms) * idf

            norm = math.sqrt(sum(weight * weight for weight in vector.values()))
            serialized_chunks.append(
                {
                    **chunk,
                    "vector": vector,
                    "norm": round(norm, 10),
                }
            )

        self._state = {
            "version": 1,
            "builtAt": datetime.now(timezone.utc).isoformat(),
            "documents": documents,
            "chunks": serialized_chunks,
        }

    def _build_query_vector(self, query: str) -> tuple[dict[str, float], float]:
        counts = Counter(tokenize_text(query))
        if not counts:
            return {}, 0.0

        total_terms = sum(counts.values()) or 1
        idf_lookup = self._idf_lookup()
        vector = {
            token: (count / total_terms) * idf_lookup.get(token, 1.0)
            for token, count in counts.items()
        }
        norm = math.sqrt(sum(weight * weight for weight in vector.values()))
        return vector, norm

    def _idf_lookup(self) -> dict[str, float]:
        idf: dict[str, float] = {}
        for chunk in self._state.get("chunks", []):
            vector = chunk.get("vector") if isinstance(chunk.get("vector"), dict) else {}
            for token, weight in vector.items():
                if token not in idf or weight > idf[token]:
                    idf[token] = float(weight)
        return idf

    def _load_documents_from_disk(self) -> list[dict[str, Any]]:
        self.knowledge_dir.mkdir(parents=True, exist_ok=True)
        candidates: dict[str, tuple[int, float, dict[str, Any]]] = {}

        for file_path in sorted(self.knowledge_dir.iterdir()):
            if not file_path.is_file():
                continue

            document = self._load_document_candidate(file_path)
            if not document:
                continue

            doc_key = document["docId"]
            priority = int(document.pop("priority", 0))
            modified_at = float(document.pop("modifiedAt", 0.0))
            current = candidates.get(doc_key)
            if current and (current[0] > priority or (current[0] == priority and current[1] >= modified_at)):
                continue

            candidates[doc_key] = (priority, modified_at, document)

        return [item[2] for item in sorted(candidates.values(), key=lambda value: value[2]["docId"])]

    def _load_document_candidate(self, file_path: Path) -> dict[str, Any] | None:
        suffix = file_path.suffix.lower()
        modified_at = file_path.stat().st_mtime
        if suffix == ".json":
            return self._load_json_document(file_path, modified_at)

        if suffix == ".md":
            return self._load_markdown_document(file_path, modified_at)

        if suffix == ".txt" and file_path.name.endswith(".transcript.txt"):
            return self._load_transcript_document(file_path, modified_at)

        return None

    def _load_json_document(self, file_path: Path, modified_at: float) -> dict[str, Any] | None:
        try:
            payload = json.loads(file_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            return None

        if not isinstance(payload, dict):
            return None

        video_name = trim_string(payload.get("video") or file_path.stem)
        doc_id = compact_key(video_name or file_path.stem)
        segments = payload.get("segments") if isinstance(payload.get("segments"), list) else []
        chunks = [
            {
                "chunkId": f"{doc_id}:chunk:{index}",
                "start": float(segment.get("start") or 0.0),
                "end": float(segment.get("end") or segment.get("start") or 0.0),
                "text": trim_string(segment.get("text")),
            }
            for index, segment in enumerate(segments)
            if trim_string(segment.get("text"))
        ]

        if not chunks and trim_string(payload.get("text")):
            chunks = [
                {
                    "chunkId": f"{doc_id}:chunk:0",
                    "start": 0.0,
                    "end": 0.0,
                    "text": trim_string(payload.get("text")),
                }
            ]

        if not chunks:
            return None

        return {
            "docId": doc_id,
            "videoName": video_name,
            "sourcePath": str(file_path),
            "markdownPath": "",
            "language": trim_string(payload.get("language")) or "auto",
            "model": trim_string(payload.get("model")),
            "chunks": chunks,
            "priority": 3,
            "modifiedAt": modified_at,
        }

    def _load_markdown_document(self, file_path: Path, modified_at: float) -> dict[str, Any] | None:
        try:
            lines = file_path.read_text(encoding="utf-8").splitlines()
        except OSError:
            return None

        video_name = trim_string(file_path.stem)
        doc_id = compact_key(video_name)
        language = "auto"
        model = ""
        chunks: list[dict[str, Any]] = []
        current_start = 0.0
        current_end = 0.0
        awaiting_text = False

        for line in lines:
            stripped = trim_string(line)
            if stripped.startswith("> 🌐 检测语言:"):
                language = trim_string(stripped.split(":", 1)[1]) or "auto"
                continue

            if stripped.startswith("> 🤖 转录模型:"):
                model = trim_string(stripped.split(":", 1)[1])
                continue

            match = MARKDOWN_SEGMENT_PATTERN.match(stripped)
            if match:
                current_start = parse_timestamp(match.group("start"))
                current_end = parse_timestamp(match.group("end"))
                awaiting_text = True
                continue

            if awaiting_text and stripped:
                chunks.append(
                    {
                        "chunkId": f"{doc_id}:chunk:{len(chunks)}",
                        "start": current_start,
                        "end": current_end,
                        "text": stripped,
                    }
                )
                awaiting_text = False

        if not chunks:
            return None

        return {
            "docId": doc_id,
            "videoName": video_name,
            "sourcePath": str(file_path),
            "markdownPath": str(file_path),
            "language": language,
            "model": model,
            "chunks": chunks,
            "priority": 1,
            "modifiedAt": modified_at,
        }

    def _load_transcript_document(self, file_path: Path, modified_at: float) -> dict[str, Any] | None:
        try:
            lines = file_path.read_text(encoding="utf-8").splitlines()
        except OSError:
            return None

        doc_id = compact_key(file_path.stem.replace(".transcript", ""))
        chunks: list[dict[str, Any]] = []
        for line in lines:
            match = TRANSCRIPT_LINE_PATTERN.match(trim_string(line))
            if not match:
                continue

            text = trim_string(match.group("text"))
            if not text:
                continue

            start = parse_timestamp(match.group("start"))
            chunks.append(
                {
                    "chunkId": f"{doc_id}:chunk:{len(chunks)}",
                    "start": start,
                    "end": start,
                    "text": text,
                }
            )

        if not chunks:
            return None

        return {
            "docId": doc_id,
            "videoName": trim_string(file_path.stem.replace(".transcript", "")),
            "sourcePath": str(file_path),
            "markdownPath": "",
            "language": "auto",
            "model": "transcript",
            "chunks": chunks,
            "priority": 2,
            "modifiedAt": modified_at,
        }

    def _build_document_from_payload(
        self,
        *,
        video_name: str,
        markdown_path: str,
        source_path: str,
        language: str,
        model: str,
        segments: list[dict[str, Any]],
        text: str,
    ) -> dict[str, Any]:
        doc_source = trim_string(markdown_path or source_path or video_name)
        video = trim_string(video_name) or Path(doc_source or "knowledge").stem
        doc_id = compact_key(video or doc_source or "knowledge")

        chunks = [
            {
                "chunkId": f"{doc_id}:chunk:{index}",
                "start": float(segment.get("start") or 0.0),
                "end": float(segment.get("end") or segment.get("start") or 0.0),
                "text": trim_string(segment.get("text")),
            }
            for index, segment in enumerate(segments)
            if trim_string(segment.get("text"))
        ]

        if not chunks and trim_string(text):
            chunks = [
                {
                    "chunkId": f"{doc_id}:chunk:0",
                    "start": 0.0,
                    "end": 0.0,
                    "text": trim_string(text),
                }
            ]

        return {
            "docId": doc_id,
            "videoName": video,
            "sourcePath": trim_string(source_path or markdown_path),
            "markdownPath": trim_string(markdown_path),
            "language": trim_string(language) or "auto",
            "model": trim_string(model),
            "chunks": chunks,
        }