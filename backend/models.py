import os
import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    Column, String, Text, DateTime, ForeignKey, Enum, UniqueConstraint, Boolean, Integer
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from pgvector.sqlalchemy import Vector

from database import Base

# Embedding dimension for the pgvector columns below. Sourced from the
# SAME env var as ai/data_pipeline's model_config.py (TA-42) -- so the
# DB column definition and the actual embedding calls can never silently
# disagree on dimension.
EMBEDDING_DIM = int(os.environ.get("EMBEDDING_DIM", "768"))


class UserRole(str, enum.Enum):
    advisor = "advisor"
    officer = "officer"


class DocumentStatus(str, enum.Enum):
    pending_review = "pending_review"
    approved = "approved"
    rejected = "rejected"
    needs_revision = "needs_revision"


class DocumentType(str, enum.Enum):
    pdf = "pdf"
    docx = "docx"
    xlsx = "xlsx"


class ReviewStatus(str, enum.Enum):
    approved = "approved"
    rejected = "rejected"
    needs_revision = "needs_revision"


class AuditAction(str, enum.Enum):
    submitted = "submitted"
    viewed = "viewed"
    decided = "decided"
    resubmitted = "resubmitted"


class AnalysisStatus(str, enum.Enum):
    not_started = "not_started"
    in_progress = "in_progress"
    succeeded = "succeeded"
    failed = "failed"


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    role = Column(Enum(UserRole), nullable=False)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    documents = relationship("Document", back_populates="advisor")
    reviews = relationship("Review", back_populates="officer")


class Document(Base):
    __tablename__ = "documents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    advisor_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    # TA-66: officers need to know WHO submitted a document, not just
    # its raw advisor_id. Read-only relationship, additive -- doesn't
    # change how Document rows are created or queried elsewhere.
    advisor = relationship("User", foreign_keys=[advisor_id])
    status = Column(Enum(DocumentStatus), nullable=False, default=DocumentStatus.pending_review)

    @property
    def advisor_name(self) -> str:
        """Read by DocumentResponse's from_attributes -- the caller
        must eager-load the advisor relationship (joinedload) or this
        triggers a separate query per row."""
        return self.advisor.name if self.advisor else "Unknown"

    @property
    def advisor_viewed_decision(self) -> bool | None:
        """TA-92: None if not yet decided (nothing to have viewed
        yet); otherwise whether the advisor has viewed the document
        since the decision was recorded. Reads self.reviews and
        self.audit_events -- the caller must eager-load both
        (selectinload) or this triggers two extra queries per row."""
        if not self.reviews:
            return None
        decided_at = self.reviews[0].decided_at
        return any(
            e.actor_id == self.advisor_id and e.action == AuditAction.viewed and e.timestamp > decided_at
            for e in self.audit_events
        )
    file_reference = Column(String, nullable=False)
    # Pure display metadata (TA-25) -- NEVER used to construct any
    # filesystem path (that stays fully server-derived, per TA-23).
    original_filename = Column(String, nullable=True)
    type = Column(Enum(DocumentType), nullable=False)
    uploaded_at = Column(DateTime, default=datetime.utcnow)

    # Revision thread: all documents in one thread share thread_id (the first
    # submission's own id). replaces_document_id points at the specific
    # document this one supersedes, forming the ordered chain.
    thread_id = Column(UUID(as_uuid=True), nullable=False)
    replaces_document_id = Column(UUID(as_uuid=True), ForeignKey("documents.id"), nullable=True)

    advisor = relationship("User", back_populates="documents")
    reviews = relationship("Review", back_populates="document")
    analysis = relationship("AIAnalysis", back_populates="document", uselist=False)
    audit_events = relationship("AuditEvent", back_populates="document")
    pii_mappings = relationship("PIIMapping", back_populates="document")


class Review(Base):
    __tablename__ = "reviews"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id = Column(UUID(as_uuid=True), ForeignKey("documents.id"), nullable=False)
    officer_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    status = Column(Enum(ReviewStatus), nullable=False)
    comment = Column(Text, nullable=True)
    decided_at = Column(DateTime, default=datetime.utcnow)

    document = relationship("Document", back_populates="reviews")
    officer = relationship("User", back_populates="reviews")


class AIAnalysis(Base):
    __tablename__ = "ai_analysis"
    __table_args__ = (UniqueConstraint("document_id", name="uq_ai_analysis_document"),)

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id = Column(UUID(as_uuid=True), ForeignKey("documents.id"), nullable=False)
    status = Column(Enum(AnalysisStatus), nullable=False, default=AnalysisStatus.not_started)
    error_message = Column(Text, nullable=True)
    summary = Column(Text, nullable=True)
    generated_at = Column(DateTime, nullable=True)

    document = relationship("Document", back_populates="analysis")
    flags = relationship("Flag", back_populates="analysis")


class Flag(Base):
    __tablename__ = "flags"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    analysis_id = Column(UUID(as_uuid=True), ForeignKey("ai_analysis.id"), nullable=False)
    passage_excerpt = Column(Text, nullable=False)
    matched_rule_id = Column(UUID(as_uuid=True), ForeignKey("rules.id", ondelete="SET NULL"), nullable=True)
    explanation = Column(Text, nullable=False)
    severity = Column(String, nullable=False)

    analysis = relationship("AIAnalysis", back_populates="flags")
    matched_rule = relationship("Rule")


class AuditEvent(Base):
    __tablename__ = "audit_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    actor_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    document_id = Column(UUID(as_uuid=True), ForeignKey("documents.id"), nullable=False)
    action = Column(Enum(AuditAction), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)

    document = relationship("Document", back_populates="audit_events")


class PIIMapping(Base):
    __tablename__ = "pii_mappings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id = Column(UUID(as_uuid=True), ForeignKey("documents.id"), nullable=False)
    placeholder = Column(String, nullable=False)
    original_value = Column(Text, nullable=False)  # never sent to the AI vendor

    document = relationship("Document", back_populates="pii_mappings")


class Rule(Base):
    __tablename__ = "rules"
    __table_args__ = (UniqueConstraint("seed_id", name="uq_rule_seed_id"),)

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    # Stable identity from seed/rules/rules.json (e.g. "disc-001") -- lets
    # re-seeding UPDATE an existing row in place instead of deleting and
    # re-inserting with a fresh random UUID, which orphaned every flag
    # that referenced the old id (TA-55).
    seed_id = Column(String, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    text = Column(Text, nullable=False)
    type = Column(String, nullable=False)  # e.g. disclosure | prohibited_claim | performance_standard
    embedding = Column(Vector(EMBEDDING_DIM), nullable=True)


class PrecedentIndex(Base):
    __tablename__ = "precedent_index"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id = Column(UUID(as_uuid=True), ForeignKey("documents.id"), nullable=False)
    masked_text = Column(Text, nullable=False)
    decision = Column(Enum(ReviewStatus), nullable=False)
    comment = Column(Text, nullable=True)
    embedding = Column(Vector(EMBEDDING_DIM), nullable=True)


class DocumentChunk(Base):
    """
    Persists chunk embeddings so retrieval jobs can reuse them instead of
    re-embedding against a rate-limited free tier every time (TA-51).
    Also the prerequisite for the semantic-diff stretch goal.
    """
    __tablename__ = "document_chunks"
    __table_args__ = (
        UniqueConstraint("document_id", "chunk_index", name="uq_chunk_document_index"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id = Column(UUID(as_uuid=True), ForeignKey("documents.id"), nullable=False)
    chunk_index = Column(Integer, nullable=False)
    masked_text = Column(Text, nullable=False)
    embedding = Column(Vector(EMBEDDING_DIM), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    document_id = Column(UUID(as_uuid=True), ForeignKey("documents.id"), nullable=True)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
