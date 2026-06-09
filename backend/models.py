import os
import sys
from sqlalchemy import Column, String, Integer, Float, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime
import uuid

def generate_id():
    return str(uuid.uuid4())[:8]

class Meeting(Base):
    __tablename__ = "meetings"

    id          = Column(String, primary_key=True, default=generate_id)
    title       = Column(String, default="Untitled Meeting")
    department  = Column(String, default="General")
    date        = Column(DateTime, default=datetime.utcnow)
    transcript  = Column(Text)
    mom         = Column(Text)        # Minutes of Meeting (AI generated)
    status      = Column(String, default="processing")

    participants = relationship("Participant", back_populates="meeting")
    tasks        = relationship("Task", back_populates="meeting")
    logs         = relationship("Log", back_populates="meeting")


class Participant(Base):
    __tablename__ = "participants"

    id          = Column(String, primary_key=True, default=generate_id)
    meeting_id  = Column(String, ForeignKey("meetings.id"))
    name        = Column(String)
    role        = Column(String, default="employee")
    department  = Column(String, default="General")

    meeting = relationship("Meeting", back_populates="participants")


class Task(Base):
    __tablename__ = "tasks"

    id              = Column(String, primary_key=True, default=generate_id)
    meeting_id      = Column(String, ForeignKey("meetings.id"))
    title           = Column(String)
    description     = Column(Text)
    assigned_to     = Column(String)
    deadline        = Column(String)
    status          = Column(String, default="pending")   # pending/done/overdue/escalated
    confidence      = Column(Float, default=0.0)          # 0 to 100
    validated       = Column(String, default="pending")   # pending/approved/rejected
    escalated_to    = Column(String, nullable=True)

    meeting = relationship("Meeting", back_populates="tasks")


class Log(Base):
    __tablename__ = "logs"

    id          = Column(String, primary_key=True, default=generate_id)
    meeting_id  = Column(String, ForeignKey("meetings.id"))
    agent       = Column(String)      # which CrewAI agent logged this
    action      = Column(Text)        # what it did
    timestamp   = Column(DateTime, default=datetime.utcnow)

    meeting = relationship("Meeting", back_populates="logs")