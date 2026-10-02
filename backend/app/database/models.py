from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text, JSON, Boolean
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    
    id = Column(String(36), primary_key=True, index=True)
    username = Column(String(100), unique=True, index=True, default="pilot_commander")
    created_at = Column(DateTime, default=datetime.utcnow)
    
    conversations = relationship("Conversation", back_populates="user", cascade="all, delete-orphan")

class Dataset(Base):
    __tablename__ = "datasets"
    
    id = Column(String(36), primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=False)
    file_type = Column(String(20), nullable=False) # csv, xlsx, json, parquet
    file_path = Column(String(500), nullable=False)
    row_count = Column(Integer, default=0)
    column_count = Column(Integer, default=0)
    file_size_bytes = Column(Integer, default=0)
    duckdb_table_name = Column(String(100), nullable=False, unique=True)
    is_demo = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    conversations = relationship("Conversation", back_populates="dataset")
    meta = relationship("DatasetMetadata", back_populates="dataset", uselist=False, cascade="all, delete-orphan")

class DatasetMetadata(Base):
    __tablename__ = "dataset_metadata"
    
    id = Column(String(36), primary_key=True, index=True)
    dataset_id = Column(String(36), ForeignKey("datasets.id"), nullable=False, unique=True)
    columns_info = Column(JSON, nullable=False, default=dict) # list of column summaries
    summary_stats = Column(JSON, nullable=False, default=dict) # total missing, numeric cols, categorical cols, etc.
    created_at = Column(DateTime, default=datetime.utcnow)
    
    dataset = relationship("Dataset", back_populates="meta")

class Conversation(Base):
    __tablename__ = "conversations"
    
    id = Column(String(36), primary_key=True, index=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    dataset_id = Column(String(36), ForeignKey("datasets.id"), nullable=True)
    title = Column(String(255), default="Helicopter Intelligence Session")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    user = relationship("User", back_populates="conversations")
    dataset = relationship("Dataset", back_populates="conversations")
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan", order_by="Message.created_at")

class Message(Base):
    __tablename__ = "messages"
    
    id = Column(String(36), primary_key=True, index=True)
    conversation_id = Column(String(36), ForeignKey("conversations.id"), nullable=False)
    role = Column(String(20), nullable=False) # user, assistant, system
    content = Column(Text, nullable=False)
    sql_query = Column(Text, nullable=True)
    query_result = Column(JSON, nullable=True)
    mode = Column(String(20), default="nlp") # nlp, rag/query
    language = Column(String(10), default="en") # en, hi, kn
    rag_metadata = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    conversation = relationship("Conversation", back_populates="messages")

class UploadedImage(Base):
    __tablename__ = "uploaded_images"
    
    id = Column(String(36), primary_key=True, index=True)
    filename = Column(String(255), nullable=False)
    original_name = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    mime_type = Column(String(50), nullable=False)
    file_size_bytes = Column(Integer, default=0)
    analysis_result = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
