import os
import openai
import colorama
import sys
from dotenv import load_dotenv
from pathlib import Path
import re

# Инициализация окружения и цветового вывода
load_dotenv()
AI_API_KEY = os.getenv("OPENAI_API_KEY")
OBSIDIAN_PATH = Path(os.getenv("OBSIDIAN_VAULT_PATH"))

# Проверка переменных окружения
if not AI_API_KEY:
    print("❌ Ошибка: Не найден OPENAI_API_KEY в переменных окружения")
    sys.exit(1)

if not OBSIDIAN_PATH:
    print("❌ Ошибка: Не найден OBSIDIAN_VAULT_PATH в переменных окружения")
    sys.exit(1)

colorama.init(autoreset=True)

# Цветовые константы
FG = colorama.Fore
ST = colorama.Style

FIRTS_PROMT = r"""
При оформлении математических формул в Obsidian используйте LaTeX-синтаксис по следующим правилам:

1. **Встроенные формулы**
   Формулы внутри текста заключайте в одиночные `$`:

   * Пример: Среднее значение: `$\mu = \frac{1}{n} \sum x_i$`.

2. **Выносные (блочные) формулы**
   Формулы, требующие отдельной строки, обрамляйте двойными `$$` и добавляйте пробелы для удобного копирования:

   ```
   $$
   \sigma = \sqrt{\frac{\sum (x_i - \mu)^2}{n-1}}
   $$
   ```

3. **Матрицы**
   Для матриц используйте окружение `pmatrix` в блочных формулах:

   ```
   $$
   \begin{pmatrix}
   a & b \\
   c & d
   \end{pmatrix}
   $$
   ```

   * Двойной обратный слэш `\\` — для перехода на новую строку.
   * Символ `&` — для разделения столбцов.

4. **Что не использовать**

   * Устаревшие конструкции `\(...\)` и `\[...\]`.
   * Лишние комментарии и символы внутри формул.

5. **Оформление**

   * Все блочные формулы должны иметь отступы и пробелы до/после `$$`.
   * Формулы должны быть готовыми к копированию без дополнительных изменений.

6. **Пояснения для новичков (ML)**

   * Объясняйте каждый шаг подробно и простым языком.
   * При вводе новых понятий приводите примеры и короткие пояснения.

**Пример итогового ответа для начинающего:**

Дисперсия выборки вычисляется как:

$$
 s^2 = \frac{\sum (x_i - \bar{x})^2}{n-1}
$$

где:

* \$\bar{x} = \frac{1}{n} \sum x\_i\$ — выборочное среднее;
* \$n\$ — число наблюдений;
* \$x\_i\$ — отдельные значения выборки.

"""

def cprint(text: str, color: str = "WHITE", style: str = "NORMAL") -> None:
    """Печатает 'text' с заданным цветом и стилем"""
    fg = getattr(FG, color.upper(), FG.WHITE)
    st = getattr(ST, style.upper(), ST.NORMAL)
    print(f"{st}{fg}{text}{ST.RESET_ALL}")


def cinput(prompt: str, color: str = "CYAN", style: str = "BRIGHT") -> str:
    """Выводит цветной prompt и возвращает строку ввода пользователя"""
    fg = getattr(FG, color.upper(), FG.CYAN)
    st = getattr(ST, style.upper(), ST.NORMAL)
    return input(f"{st}{fg}{prompt} {ST.RESET_ALL}")


def generate_cheatsheet(topic: str) -> str:
    """Генерирует шпаргалку через AI"""
    try:
        client = openai.OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=AI_API_KEY,
        )
        response = client.chat.completions.create(
            model="deepseek/deepseek-chat:free",
            messages=[
                {"role": "system", "content": FIRTS_PROMT},
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


def update_cheatsheet(original: str, instruction: str) -> str:
    """Улучшает или упрощает существующую шпаргалку по инструкции"""
    try:
        client = openai.OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=AI_API_KEY,
        )
        response = client.chat.completions.create(
            model="deepseek/deepseek-chat:free",
            messages=[
                {
                    "role": "system",
                    "content": (
                        f"Вот основная инструкция, которой нужно следовать. Вот текущая шпаргалка, которую нужно улучшить:\n{original}"
                    ),
                },
                {
                    "role": "user",
                    "content": (f"Инструкция от пользователя: {instruction}."),
                },
            ],
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"❌ Ошибка при обновлении: {str(e)}")
        raise


def save_to_obsidian(filename: str, content: str) -> None:
    """Сохраняет файл в папку Obsidian"""
    try:
        file_path = OBSIDIAN_PATH / f"{filename}.md"
        print(f"💾 Сохранение файла: {file_path}")
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(content)
        cprint(f"✅ Шпаргалка сохранена: {file_path}", color="GREEN", style="BRIGHT")
    except Exception as e:
        print(f"❌ Ошибка при сохранении: {str(e)}")
        raise


def fix_latex_blocks(text: str) -> str:
    # Заменить \[ ... \] на $$ ... $$
    text = re.sub(r'\\\[(.*?)\\\]', r'$$\1$$', text, flags=re.DOTALL)
    # Заменить \( ... \) на $ ... $
    text = re.sub(r'\\\((.*?)\\\)', r'$\1$', text, flags=re.DOTALL)
    return text


def main() -> None:
    try:
        # Если аргумент передан через командную строку
        if len(sys.argv) > 1:
            topic = sys.argv[1]
            
            # Если есть второй аргумент, значит это отредактированный контент
            if len(sys.argv) > 2:
                content = sys.argv[2]
                save_to_obsidian(filename=topic, content=content)
                return
        else:
            topic = cinput(
                "Введите название шпаргалки:", color="YELLOW", style="BRIGHT"
            )

        content = generate_cheatsheet(topic)
        content = fix_latex_blocks(content)
        print(content)  # Выводим контент для TypeScript

    except KeyboardInterrupt:
        cprint("\n👋 Пока! <3", color="RED", style="BRIGHT")
    except Exception as e:
        cprint(f"❌ Ошибка: {str(e)}", color="RED", style="BRIGHT")
        sys.exit(1)


if __name__ == "__main__":
    main()
