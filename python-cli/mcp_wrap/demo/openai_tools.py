functions = [
    {
        "name": "search_web",
        "description": "Search the web for information using a search engine",
        "parameters": {
            "type": "object",
            "properties": {
                "query": { 
                    "type": "string",
                    "description": "The search query to look up"
                },
                "num_results": {
                    "type": "integer",
                    "description": "Number of results to return",
                    "minimum": 1,
                    "maximum": 20,
                    "default": 10
                },
                "search_type": {
                    "type": "string",
                    "enum": ["web", "news", "images", "videos"],
                    "description": "Type of search to perform"
                }
            },
            "required": ["query"]
        }
    },
    {
        "name": "analyze_sentiment",
        "description": "Analyze the sentiment of text content",
        "parameters": {
            "type": "object",
            "properties": {
                "text": {
                    "type": "string",
                    "description": "The text to analyze"
                },
                "language": {
                    "type": "string",
                    "description": "Language code (e.g., 'en', 'es', 'fr')",
                    "default": "en"
                },
                "detailed": {
                    "type": "boolean",
                    "description": "Whether to return detailed sentiment breakdown",
                    "default": False
                }
            },
            "required": ["text"]
        }
    },
    {
        "name": "create_database_query",
        "description": "Generate a SQL query based on natural language description",
        "parameters": {
            "type": "object",
            "properties": {
                "description": {
                    "type": "string",
                    "description": "Natural language description of what data to retrieve"
                },
                "database_schema": {
                    "type": "object",
                    "description": "Database schema information",
                    "properties": {
                        "tables": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "name": {"type": "string"},
                                    "columns": {
                                        "type": "array",
                                        "items": {
                                            "type": "object",
                                            "properties": {
                                                "name": {"type": "string"},
                                                "type": {"type": "string"},
                                                "nullable": {"type": "boolean"}
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                "dialect": {
                    "type": "string",
                    "enum": ["mysql", "postgresql", "sqlite", "sqlserver"],
                    "default": "postgresql"
                }
            },
            "required": ["description", "database_schema"]
        }
    },
    {
        "name": "schedule_meeting",
        "description": "Schedule a meeting with participants",
        "parameters": {
            "type": "object",
            "properties": {
                "title": {
                    "type": "string",
                    "description": "Meeting title"
                },
                "participants": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "email": {"type": "string"},
                            "name": {"type": "string"},
                            "role": {
                                "type": "string",
                                "enum": ["organizer", "attendee", "optional"]
                            }
                        },
                        "required": ["email"]
                    },
                    "description": "List of meeting participants"
                },
                "duration_minutes": {
                    "type": "integer",
                    "minimum": 15,
                    "maximum": 480,
                    "default": 60
                },
                "timezone": {
                    "type": "string",
                    "description": "Timezone for the meeting (e.g., 'America/New_York')",
                    "default": "UTC"
                }
            },
            "required": ["title", "participants"]
        }
    }
]