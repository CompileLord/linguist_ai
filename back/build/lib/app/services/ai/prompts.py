import os
from pathlib import Path
from string import Template
from typing import Dict, Optional
from app.core.exceptions import NotFoundException, ValidationException

class PromptManager:
    def __init__(self, prompts_dir: Optional[Path] = None) -> None:
        if prompts_dir is None:
            base_dir = Path(__file__).resolve().parent.parent.parent.parent
            self.prompts_dir = base_dir / "prompts"
        else:
            self.prompts_dir = prompts_dir
        self._cache: Dict[str, Template] = {}

    def render(self, template_name: str, **variables) -> str:
        template = self._get_template(template_name)
        try:
            return template.substitute(**variables)
        except KeyError as e:
            missing_key = str(e)
            raise ValidationException(
                detail=f"Missing required variable {missing_key} for prompt template {template_name}",
                error_code="PROMPT_VARIABLE_MISSING"
            )

    def _get_template(self, template_name: str) -> Template:
        if template_name in self._cache:
            return self._cache[template_name]

        file_path = self.prompts_dir / f"{template_name}.txt"
        if not file_path.exists():
            file_path = self.prompts_dir / f"{template_name}.md"

        if not file_path.exists():
            raise NotFoundException(
                detail=f"Prompt template {template_name} not found at {file_path}",
                error_code="PROMPT_TEMPLATE_NOT_FOUND"
            )

        try:
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()
            template = Template(content)
            self._cache[template_name] = template
            return template
        except Exception as e:
            raise ValidationException(
                detail=f"Failed to read prompt template {template_name}: {str(e)}",
                error_code="PROMPT_READ_ERROR"
            )

_prompt_manager = PromptManager()

def get_prompt_manager() -> PromptManager:
    return _prompt_manager
