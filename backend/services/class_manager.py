"""Class Management Service for Stimme"""
import os
import uuid
import shutil
from datetime import datetime
from database import SessionLocal, SoundClass, AudioSample
from config import AUDIO_SAMPLES_DIR


# Default class categories with icons
DEFAULT_CATEGORIES = {
    "Birds": {
        "icon": "🐦",
        "classes": ["Crow", "Sparrow", "Owl", "Eagle", "Parrot", "Cuckoo", "Pigeon", "Robin"]
    },
    "Vehicles": {
        "icon": "🚗",
        "classes": ["Car Engine", "Motorcycle", "Truck", "Train", "Airplane", "Helicopter", "Horn", "Siren"]
    },
    "Weather": {
        "icon": "🌧️",
        "classes": ["Rain", "Thunder", "Wind", "Hail", "Storm"]
    },
    "Music": {
        "icon": "🎵",
        "classes": ["Piano", "Guitar", "Drums", "Violin", "Flute"]
    },
    "Human": {
        "icon": "🗣️",
        "classes": ["Speech", "Laugh", "Clap", "Whistle", "Cough", "Sneeze"]
    },
    "Nature": {
        "icon": "🌿",
        "classes": ["Water Stream", "Ocean Waves", "Forest", "Crickets"]
    },
    "Urban": {
        "icon": "🏙️",
        "classes": ["Construction", "Traffic", "Door Knock", "Phone Ring"]
    }
}

CATEGORY_ICONS = {
    "Birds": "🐦", "Vehicles": "🚗", "Weather": "🌧️", "Music": "🎵",
    "Human": "🗣️", "Nature": "🌿", "Urban": "🏙️", "Custom": "⚡"
}


class ClassManager:
    """Manages sound classes and audio samples."""

    def initialize_default_classes(self):
        """Create default sound classes if none exist."""
        db = SessionLocal()
        existing = db.query(SoundClass).count()
        if existing > 0:
            db.close()
            return

        for category, info in DEFAULT_CATEGORIES.items():
            for class_name in info["classes"]:
                sc = SoundClass(
                    name=class_name,
                    category=category,
                    icon=info["icon"],
                    description=f"{class_name} sound in the {category} category"
                )
                db.add(sc)

        db.commit()
        db.close()
        print(f"[ClassManager] Initialized {sum(len(v['classes']) for v in DEFAULT_CATEGORIES.values())} default classes")

    def get_all_classes(self) -> list:
        """Get all sound classes grouped by category."""
        db = SessionLocal()
        classes = db.query(SoundClass).order_by(SoundClass.category, SoundClass.name).all()
        result = []
        for c in classes:
            result.append({
                "id": c.id,
                "name": c.name,
                "category": c.category,
                "icon": c.icon,
                "description": c.description,
                "sample_count": c.sample_count,
                "created_at": c.created_at.isoformat() if c.created_at else ""
            })
        db.close()
        return result

    def get_categories(self) -> list:
        """Get list of categories with counts."""
        db = SessionLocal()
        classes = db.query(SoundClass).all()
        cat_map = {}
        for c in classes:
            if c.category not in cat_map:
                cat_map[c.category] = {
                    "name": c.category,
                    "icon": CATEGORY_ICONS.get(c.category, "📁"),
                    "class_count": 0,
                    "total_samples": 0
                }
            cat_map[c.category]["class_count"] += 1
            cat_map[c.category]["total_samples"] += c.sample_count
        db.close()
        return list(cat_map.values())

    def create_class(self, name: str, category: str, description: str = "",
                     icon: str = "") -> dict:
        """Create a new sound class."""
        db = SessionLocal()
        existing = db.query(SoundClass).filter(SoundClass.name == name).first()
        if existing:
            db.close()
            return {"error": f"Class '{name}' already exists"}

        if not icon:
            icon = CATEGORY_ICONS.get(category, "📁")

        sc = SoundClass(
            name=name,
            category=category,
            description=description,
            icon=icon
        )
        db.add(sc)
        db.commit()
        db.refresh(sc)

        # Create sample directory
        class_dir = os.path.join(AUDIO_SAMPLES_DIR, str(sc.id))
        os.makedirs(class_dir, exist_ok=True)

        result = {
            "id": sc.id,
            "name": sc.name,
            "category": sc.category,
            "icon": sc.icon,
            "description": sc.description,
            "sample_count": 0
        }
        db.close()
        return result

    def delete_class(self, class_id: int) -> dict:
        """Delete a sound class and all its samples."""
        db = SessionLocal()
        sc = db.query(SoundClass).filter(SoundClass.id == class_id).first()
        if not sc:
            db.close()
            return {"error": "Class not found"}

        # Delete audio files
        class_dir = os.path.join(AUDIO_SAMPLES_DIR, str(class_id))
        if os.path.exists(class_dir):
            shutil.rmtree(class_dir)

        name = sc.name
        db.delete(sc)
        db.commit()
        db.close()
        return {"success": True, "deleted": name}

    def add_sample(self, class_id: int, file_bytes: bytes,
                   original_filename: str = "") -> dict:
        """Add an audio sample to a class."""
        db = SessionLocal()
        sc = db.query(SoundClass).filter(SoundClass.id == class_id).first()
        if not sc:
            db.close()
            return {"error": "Class not found"}

        # Save file
        class_dir = os.path.join(AUDIO_SAMPLES_DIR, str(class_id))
        os.makedirs(class_dir, exist_ok=True)

        ext = os.path.splitext(original_filename)[1] if original_filename else ".wav"
        filename = f"{uuid.uuid4().hex}{ext}"
        filepath = os.path.join(class_dir, filename)

        with open(filepath, 'wb') as f:
            f.write(file_bytes)

        # Get audio info
        from audio_processor import audio_processor
        try:
            waveform = audio_processor.load_audio(file_bytes)
            duration = len(waveform) / audio_processor.sr
        except Exception:
            duration = 0

        # Save to database
        sample = AudioSample(
            class_id=class_id,
            filename=filename,
            original_name=original_filename,
            duration=round(duration, 2),
            sample_rate=16000,
            file_size=len(file_bytes)
        )
        db.add(sample)

        # Update sample count
        sc.sample_count = db.query(AudioSample).filter(
            AudioSample.class_id == class_id
        ).count() + 1
        db.commit()

        result = {
            "id": sample.id,
            "filename": filename,
            "original_name": original_filename,
            "duration": round(duration, 2),
            "class_name": sc.name
        }
        db.close()
        return result

    def get_samples(self, class_id: int) -> list:
        """Get all audio samples for a class."""
        db = SessionLocal()
        samples = db.query(AudioSample).filter(
            AudioSample.class_id == class_id
        ).order_by(AudioSample.created_at.desc()).all()

        result = []
        for s in samples:
            result.append({
                "id": s.id,
                "filename": s.filename,
                "original_name": s.original_name,
                "duration": s.duration,
                "file_size": s.file_size,
                "created_at": s.created_at.isoformat() if s.created_at else ""
            })
        db.close()
        return result

    def delete_sample(self, sample_id: int) -> dict:
        """Delete a specific audio sample."""
        db = SessionLocal()
        sample = db.query(AudioSample).filter(AudioSample.id == sample_id).first()
        if not sample:
            db.close()
            return {"error": "Sample not found"}

        # Delete file
        class_dir = os.path.join(AUDIO_SAMPLES_DIR, str(sample.class_id))
        filepath = os.path.join(class_dir, sample.filename)
        if os.path.exists(filepath):
            os.remove(filepath)

        class_id = sample.class_id
        db.delete(sample)

        # Update sample count
        sc = db.query(SoundClass).filter(SoundClass.id == class_id).first()
        if sc:
            sc.sample_count = db.query(AudioSample).filter(
                AudioSample.class_id == class_id
            ).count()

        db.commit()
        db.close()
        return {"success": True}


# Global instance
class_manager = ClassManager()
