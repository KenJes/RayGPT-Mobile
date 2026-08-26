from sentence_transformers import SentenceTransformer
from app.config import settings

class EmbeddingService:
    def __init__(self):
        self.model_name = settings.embedding_model
        self._model = None

    @property
    def model(self):
        if self._model is None:
            self._model = SentenceTransformer(self.model_name)
        return self._model

    def encode(self, texts: list[str]) -> list[list[float]]:
        return self.model.encode(texts).tolist()

    def encode_query(self, query: str) -> list[float]:
        return self.model.encode([query])[0].tolist()

embedding_service = EmbeddingService()
