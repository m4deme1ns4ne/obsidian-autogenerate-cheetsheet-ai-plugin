from dataclasses import dataclass
from pathlib import Path
from backend.promts import DEFAULT_PROMPT


@dataclass
class Config:
    LLM_API_KEY: str
    OBSIDIAN_VAULT_PATH: str
    LLM_MODEL: str = "deepseek/deepseek-chat:free"
    MAIN_PROMT: str = DEFAULT_PROMPT

    def __post_init__(self):
        if not self.LLM_API_KEY:
            raise ValueError("❌ Ошибка: Не найден LLM_API_KEY в переменных окружения")
        path = Path(self.OBSIDIAN_VAULT_PATH)
        if not self.OBSIDIAN_VAULT_PATH:
            raise ValueError("❌ OBSIDIAN_VAULT_PATH не указан")
        if not path.exists():
            raise ValueError(f"❌ Путь {self.OBSIDIAN_VAULT_PATH} не существует")
        if not self.MAIN_PROMT:
            print(
                "Предупреждение: Нету важной переменной MAIN_PROMT, вместо нее будет использоваться стандартный промт"
            )
        if not self.LLM_MODEL:
            print(
                "Предупреждение: Нету важной переменной LLM_MODEL, вместо нее будет использоваться стандартная модель deepseek/deepseek-chat:free"
            )
