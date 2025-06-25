from langchain.tools import Tool
from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from enum import Enum

# Complex input models
class SearchType(str, Enum):
    WEB = "web"
    NEWS = "news"
    IMAGES = "images"
    VIDEOS = "videos"

class SearchInput(BaseModel):
    query: str = Field(..., description="The search query to look up")
    num_results: int = Field(default=10, ge=1, le=20, description="Number of results to return")
    search_type: SearchType = Field(default=SearchType.WEB, description="Type of search to perform")

class SentimentInput(BaseModel):
    text: str = Field(..., description="The text to analyze")
    language: str = Field(default="en", description="Language code (e.g., 'en', 'es', 'fr')")
    detailed: bool = Field(default=False, description="Whether to return detailed sentiment breakdown")

class DatabaseColumn(BaseModel):
    name: str = Field(..., description="Column name")
    type: str = Field(..., description="Column data type")
    nullable: bool = Field(default=True, description="Whether column can be null")

class DatabaseTable(BaseModel):
    name: str = Field(..., description="Table name")
    columns: List[DatabaseColumn] = Field(..., description="Table columns")

class DatabaseSchema(BaseModel):
    tables: List[DatabaseTable] = Field(..., description="Database tables")

class SQLDialect(str, Enum):
    MYSQL = "mysql"
    POSTGRESQL = "postgresql"
    SQLITE = "sqlite"
    SQLSERVER = "sqlserver"

class DatabaseQueryInput(BaseModel):
    description: str = Field(..., description="Natural language description of what data to retrieve")
    database_schema: DatabaseSchema = Field(..., description="Database schema information")
    dialect: SQLDialect = Field(default=SQLDialect.POSTGRESQL, description="SQL dialect to use")

class ParticipantRole(str, Enum):
    ORGANIZER = "organizer"
    ATTENDEE = "attendee"
    OPTIONAL = "optional"

class MeetingParticipant(BaseModel):
    email: str = Field(..., description="Participant email")
    name: Optional[str] = Field(None, description="Participant name")
    role: ParticipantRole = Field(default=ParticipantRole.ATTENDEE, description="Participant role")

class MeetingInput(BaseModel):
    title: str = Field(..., description="Meeting title")
    participants: List[MeetingParticipant] = Field(..., description="List of meeting participants")
    duration_minutes: int = Field(default=60, ge=15, le=480, description="Meeting duration in minutes")
    timezone: str = Field(default="UTC", description="Timezone for the meeting")

# Tool functions
def search_web_func(query: str, num_results: int = 10, search_type: SearchType = SearchType.WEB) -> str:
    return f"Searching for '{query}' with {num_results} results of type {search_type}"

def analyze_sentiment_func(text: str, language: str = "en", detailed: bool = False) -> str:
    detail_level = "detailed" if detailed else "basic"
    return f"Analyzing sentiment of '{text[:50]}...' in {language} with {detail_level} analysis"

def create_database_query_func(description: str, database_schema: DatabaseSchema, dialect: SQLDialect = SQLDialect.POSTGRESQL) -> str:
    table_count = len(database_schema.tables)
    return f"Generating {dialect} query for: {description} (using {table_count} tables)"

def schedule_meeting_func(title: str, participants: List[MeetingParticipant], duration_minutes: int = 60, timezone: str = "UTC") -> str:
    participant_count = len(participants)
    return f"Scheduling meeting '{title}' with {participant_count} participants for {duration_minutes} minutes in {timezone}"

# Create tools
search_web_tool = Tool.from_function(
    func=search_web_func,
    name="search_web",
    description="Search the web for information using a search engine",
    args_schema=SearchInput
)

sentiment_tool = Tool.from_function(
    func=analyze_sentiment_func,
    name="analyze_sentiment",
    description="Analyze the sentiment of text content",
    args_schema=SentimentInput
)

database_query_tool = Tool.from_function(
    func=create_database_query_func,
    name="create_database_query",
    description="Generate a SQL query based on natural language description",
    args_schema=DatabaseQueryInput
)

meeting_tool = Tool.from_function(
    func=schedule_meeting_func,
    name="schedule_meeting",
    description="Schedule a meeting with participants",
    args_schema=MeetingInput
)