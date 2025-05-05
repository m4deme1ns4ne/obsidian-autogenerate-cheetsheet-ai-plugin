import re


def fix_latex_blocks(text: str) -> str:
    # Заменить \[ ... \] на $$ ... $$
    text = re.sub(r"\\\[(.*?)\\\]", r"$$\1$$", text, flags=re.DOTALL)
    # Заменить \( ... \) на $ ... $
    text = re.sub(r"\\\((.*?)\\\)", r"$\1$", text, flags=re.DOTALL)
    return text
