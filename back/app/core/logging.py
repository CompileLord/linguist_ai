import logging
import json
import os
import sys
from contextvars import ContextVar
from typing import Any, Dict

request_id_var: ContextVar[str] = ContextVar("request_id", default="")
user_id_var: ContextVar[str] = ContextVar("user_id", default="")

class StructuredJSONFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        log_data: Dict[str, Any] = {
            "timestamp": self.formatTime(record, self.datefmt),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage()
        }
        
        request_id = request_id_var.get()
        if request_id:
            log_data["request_id"] = request_id
            
        user_id = user_id_var.get()
        if user_id:
            log_data["user_id"] = user_id

        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)

        return json.dumps(log_data)

class LoggerFactory:
    @staticmethod
    def get_logger(name: str) -> logging.Logger:
        logger = logging.getLogger(name)
        if not logger.handlers:
            logger.setLevel(logging.DEBUG)
            handler = logging.StreamHandler(sys.stdout)
            env = os.getenv("APP_ENV", "development")
            if env == "production":
                formatter = StructuredJSONFormatter()
            else:
                formatter = logging.Formatter(
                    "[%(asctime)s] [%(levelname)s] [%(name)s] %(message)s"
                )
            handler.setFormatter(formatter)
            logger.addHandler(handler)
        return logger
