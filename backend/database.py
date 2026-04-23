"""Database models for Stimme"""
from datetime import datetime
from sqlalchemy import create_engine, Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from config import DATABASE_URL

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class SoundClass(Base):
    __tablename__ = "sound_classes"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    category = Column(String(50), nullable=False)  # e.g., "Birds", "Vehicles"
    description = Column(Text, default="")
    icon = Column(String(10), default="🔊")
    sample_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    samples = relationship("AudioSample", back_populates="sound_class", cascade="all, delete-orphan")


class AudioSample(Base):
    __tablename__ = "audio_samples"

    id = Column(Integer, primary_key=True, index=True)
    class_id = Column(Integer, ForeignKey("sound_classes.id"), nullable=False)
    filename = Column(String(255), nullable=False)
    original_name = Column(String(255), default="")
    duration = Column(Float, default=0.0)
    sample_rate = Column(Integer, default=16000)
    file_size = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    sound_class = relationship("SoundClass", back_populates="samples")


class TrainedModel(Base):
    __tablename__ = "trained_models"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    architecture = Column(String(50), nullable=False)  # "yamnet", "cnn", "lstm"
    description = Column(Text, default="")
    classes_json = Column(Text, default="[]")  # JSON list of class names
    num_classes = Column(Integer, default=0)
    accuracy = Column(Float, default=0.0)
    file_path = Column(String(500), default="")
    is_active = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class ClassificationHistory(Base):
    __tablename__ = "classification_history"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(255), default="")
    source = Column(String(20), default="upload")  # "upload" or "record"
    predicted_class = Column(String(100), default="")
    confidence = Column(Float, default=0.0)
    model_used = Column(String(100), default="")
    all_predictions_json = Column(Text, default="[]")
    created_at = Column(DateTime, default=datetime.utcnow)


def init_db():
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
