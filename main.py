import os
import openai
import sys
from dotenv import load_dotenv
from backend.fix_latex_blocks import fix_latex_blocks
from backend.config import Config
from backend.promts import MAIN_PROMT

load_dotenv()

config = Config(
    LLM_API_KEY=os.getenv("LLM_API_KEY", ""),
    OBSIDIAN_VAULT_PATH=os.getenv("OBSIDIAN_VAULT_PATH", ""),
    MAIN_PROMT=MAIN_PROMT,
)


def generate_cheatsheet(topic: str) -> str:
    """Генерирует шпаргалку через AI"""
    try:
        client = openai.OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=config.LLM_API_KEY,
        )
        response = client.chat.completions.create(
            model=config.LLM_MODEL,
            messages=[
                {"role": "system", "content": config.MAIN_PROMT},
                {
                    "role": "user",
                    "content": (
                        f"Создай шпаргалку по теме: {topic}. "
                        "Используй заголовки ##, списки, таблицы и примеры кода. "
                        "Все формулы должны быть в блоках $$...$$ с правильным форматированием матриц."
                    ),
                },
            ],
        )
        content = response.choices[0].message.content.strip()
        return content
    except Exception as e:
        print(f"❌ Ошибка при генерации: {str(e)}")
        raise


def save_to_obsidian(filename: str, content: str) -> None:
    """Сохраняет файл в папку Obsidian"""
    try:
        file_path = f"{config.OBSIDIAN_VAULT_PATH}/{filename}.md"
        print(f"💾 Сохранение файла: {file_path}")
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"✅ Шпаргалка сохранена: {file_path}")
    except Exception as e:
        print(f"❌ Ошибка при сохранении: {str(e)}")
        raise


def main() -> None:
    try:
        # Если аргумент передан через командную строку
        topic = sys.argv[1]

        # Если есть второй аргумент, значит это отредактированный контент
        if len(sys.argv) > 2:
            file_path = sys.argv[2]
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()
            save_to_obsidian(filename=topic, content=content)
            return

        content = generate_cheatsheet(topic)
        content = fix_latex_blocks(content)
        print(content)

    except KeyboardInterrupt:
        print("\n👋 Пока! <3")
    except Exception as err:
        print(f"❌ Ошибка: {str(err)}")
        sys.exit(1)


if __name__ == "__main__":
    main()
