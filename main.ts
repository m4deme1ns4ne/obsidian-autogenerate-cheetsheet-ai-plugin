import {
  Plugin,
  Modal,
  Notice,
  TextComponent,
  App,
  MarkdownRenderer,
  Component,
} from "obsidian";
import { exec } from "child_process";
import { promisify } from "util";
import { writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

const execPromise = promisify(exec);

export default class CheatsheetGeneratorPlugin extends Plugin {
  async onload() {
    // Добавляем команду для открытия модального окна
    this.addCommand({
      id: "generate-cheatsheet",
      name: "Generate Cheatsheet",
      callback: () => {
        new CheatsheetModal(this.app, async (topic: string) => {
          await this.generateCheatsheet(topic);
        }).open();
      },
    });
  }

  async generateCheatsheet(topic: string) {
    const progressModal = new ProgressModal(this.app, topic);
    progressModal.open();

    try {
      new Notice(`Generating cheatsheet for topic: ${topic}...`);
      console.log("Starting generation for topic:", topic);

      // Команда для выполнения Python-скрипта
      const command = `cd "/Users/aleksandrvolzanin/Machine learning/.obsidian/plugins/extension_ai_obsidian" && source ".venv/bin/activate" && python3 main.py "${topic}"`;
      console.log("Executing command:", command);

      const { stdout, stderr } = await execPromise(command);
      console.log("Python script output:", stdout);
      console.log("Python script errors:", stderr);

      if (stderr) {
        console.error(`Error: ${stderr}`);
        new Notice(`Error generating cheatsheet: ${stderr}`);
        progressModal.close();
        return;
      }

      if (!stdout) {
        console.error("No output from Python script");
        new Notice("Failed to generate cheatsheet: No output received");
        progressModal.close();
        return;
      }

      progressModal.close();

      // Открываем модальное окно для редактирования
      new EditCheatsheetModal(this.app, stdout, async (content: string) => {
        await this.saveCheatsheet(topic, content);
      }).open();
    } catch (error: any) {
      console.error(`Failed to generate cheatsheet:`, error);
      new Notice(
        `Failed to generate cheatsheet: ${error.message || "Unknown error"}`
      );
      progressModal.close();
    }
  }

  async saveCheatsheet(topic: string, content: string) {
    const progressModal = new ProgressModal(this.app, "Saving cheatsheet...");
    progressModal.open();

    try {
      console.log("Saving cheatsheet for topic:", topic);
      const tmpFilePath = join(tmpdir(), `cheatsheet_${Date.now()}.md`);
      writeFileSync(tmpFilePath, content, "utf-8");
      const command = `cd "/Users/aleksandrvolzanin/Machine learning/.obsidian/plugins/extension_ai_obsidian" && source ".venv/bin/activate" && python3 main.py "${topic}" "${tmpFilePath}"`;
      console.log("Executing save command:", command);

      const { stdout, stderr } = await execPromise(command);
      console.log("Save script output:", stdout);
      console.log("Save script errors:", stderr);

      if (stderr) {
        console.error(`Error: ${stderr}`);
        new Notice(`Error saving cheatsheet: ${stderr}`);
        progressModal.close();
        return;
      }

      progressModal.close();
      new Notice(`Cheatsheet for "${topic}" saved successfully!`);
    } catch (error: any) {
      console.error(`Failed to save cheatsheet:`, error);
      new Notice(
        `Failed to save cheatsheet: ${error.message || "Unknown error"}`
      );
      progressModal.close();
    }
  }

  onunload() {
    // Код для очистки при выгрузке плагина (если нужно)
  }
}

// Модальное окно для ввода темы шпаргалки
class CheatsheetModal extends Modal {
  private onSubmit: (topic: string) => void;
  private topic: string = "";

  constructor(app: App, onSubmit: (topic: string) => void) {
    super(app);
    this.onSubmit = onSubmit;
  }

  onOpen() {
    const { contentEl } = this;

    contentEl.createEl("h2", { text: "Generate Cheatsheet" });
    contentEl.createEl("p", { text: "Enter the topic for your cheatsheet:" });

    // Поле для ввода темы
    const input = new TextComponent(contentEl);
    input.setPlaceholder("e.g., Linear Regression").onChange((value) => {
      this.topic = value;
    });

    // Кнопка "Generate"
    const button = contentEl.createEl("button", { text: "Generate" });
    button.style.marginTop = "10px";
    button.addEventListener("click", () => {
      if (this.topic.trim() === "") {
        new Notice("Please enter a topic.");
        return;
      }
      this.onSubmit(this.topic);
      this.close();
    });

    // Обработчик нажатия Enter
    input.inputEl.addEventListener("keypress", (e) => {
      if (e.key === "Enter" && this.topic.trim() !== "") {
        this.onSubmit(this.topic);
        this.close();
      }
    });
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}

class MarkdownPreviewComponent extends Component {
  constructor(public app: App) {
    super();
  }
}

class EditCheatsheetModal extends Modal {
  private onSubmit: (content: string) => void;
  private content: string;
  private textarea!: HTMLTextAreaElement;
  private previewEl!: HTMLElement;

  constructor(app: App, content: string, onSubmit: (content: string) => void) {
    super(app);
    this.content = content;
    this.onSubmit = onSubmit;
  }

  onOpen() {
    const { contentEl } = this;

    // Увеличиваем размер модального окна и улучшаем стиль
    this.modalEl.style.width = "90vw";
    this.modalEl.style.height = "90vh";
    this.modalEl.style.maxWidth = "1500px";

    // Улучшаем стиль модального окна
    this.modalEl.addClass("stylish-modal");

    // Добавляем CSS стили для нового дизайна
    const styleEl = document.createElement("style");
    styleEl.textContent = `
      .stylish-modal {
        border: none !important;
        border-radius: 12px !important;
        box-shadow: 0 8px 30px rgba(0, 0, 0, 0.2) !important;
        background-color: var(--background-primary) !important;
      }
      
      .stylish-modal .modal-close-button {
        color: var(--text-normal) !important;
        top: 14px !important;
        right: 14px !important;
      }
      
      .stylish-modal .modal-content {
        padding: 0 !important;
      }
      
      .editor-preview-split {
        border-radius: 8px !important;
        overflow: hidden !important;
      }
      
      .editor-panel, .preview-panel {
        background-color: var(--background-secondary) !important;
        border-radius: 8px !important;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1) !important;
      }
      
      .preview-panel {
        background-color: var(--background-secondary-alt) !important;
      }
      
      .panel-header {
        font-size: 16px !important;
        font-weight: 600 !important;
        color: var(--text-normal) !important;
        padding: 12px !important;
        margin: 0 !important;
        background-color: var(--background-secondary-alt) !important;
        border-bottom: 1px solid var(--background-modifier-border) !important;
        border-radius: 8px 8px 0 0 !important;
      }
      
      .stylish-modal button {
        background-color: var(--interactive-accent) !important;
        color: var(--text-on-accent) !important;
        border: none !important;
        border-radius: 6px !important;
        padding: 8px 16px !important;
        font-weight: 600 !important;
        transition: background-color 0.2s ease !important;
      }
      
      .stylish-modal button:hover {
        background-color: var(--interactive-accent-hover) !important;
      }
      
      .stylish-textarea {
        border: none !important;
        background-color: var(--background-primary) !important;
        resize: none !important;
        font-family: var(--font-monospace) !important;
        padding: 12px !important;
        border-radius: 0 0 8px 8px !important;
      }
    `;
    document.head.appendChild(styleEl);

    // Создаем контейнер для содержимого
    const container = contentEl.createDiv({
      attr: {
        style:
          "display: flex; flex-direction: column; width: 100%; height: 100%; padding: 20px;",
      },
    });

    container.createEl("h2", {
      text: "Edit Cheatsheet",
      attr: {
        style:
          "margin: 0 0 20px 0; font-size: 24px; color: var(--text-normal);",
      },
    });

    // Создаем контейнер с разделением на две части
    const splitContainer = container.createDiv({
      attr: {
        style: "display: flex; width: 100%; height: 100%; gap: 20px;",
        class: "editor-preview-split",
      },
    });

    // Левая панель для редактирования
    const editorContainer = splitContainer.createDiv({
      attr: {
        style: "flex: 1; display: flex; flex-direction: column;",
        class: "editor-panel",
      },
    });

    // Правая панель для предпросмотра
    const previewContainer = splitContainer.createDiv({
      attr: {
        style: "flex: 1; display: flex; flex-direction: column;",
        class: "preview-panel",
      },
    });

    // Добавляем заголовки для каждой панели
    editorContainer.createEl("h3", {
      text: "Редактор",
      attr: {
        style: "margin: 0;",
        class: "panel-header",
      },
    });

    previewContainer.createEl("h3", {
      text: "Предпросмотр",
      attr: {
        style: "margin: 0;",
        class: "panel-header",
      },
    });

    // Создаем текстовое поле в левой панели
    this.textarea = editorContainer.createEl("textarea", {
      attr: {
        style: "width: 100%; height: 100%; margin: 0;",
        class: "stylish-textarea",
      },
    }) as HTMLTextAreaElement;
    this.textarea.value = this.content;

    // Создаем область предпросмотра в правой панели
    this.previewEl = previewContainer.createDiv({
      attr: {
        style: "height: 100%; padding: 20px; overflow-y: auto;",
      },
    });

    // Обновляем предпросмотр при изменении текста
    this.textarea.addEventListener("input", () => {
      this.updatePreview();
    });

    // Инициализируем предпросмотр
    this.updatePreview();

    // Кнопка сохранения
    const buttonContainer = contentEl.createDiv({
      attr: {
        style: "display: flex; justify-content: flex-end; margin-top: 20px;",
      },
    });

    const button = buttonContainer.createEl("button", { text: "Save" });
    button.addEventListener("click", () => {
      this.onSubmit(this.textarea.value);
      this.close();
    });
  }

  updatePreview() {
    this.previewEl.empty();
    MarkdownRenderer.renderMarkdown(
      this.textarea.value,
      this.previewEl,
      "",
      new MarkdownPreviewComponent(this.app)
    );
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();

    // Удаляем стили при закрытии
    const styleEl = document.querySelector("style:contains(.stylish-modal)");
    if (styleEl) {
      styleEl.remove();
    }
  }
}

class ProgressModal extends Modal {
  private message: string;

  constructor(app: App, message: string) {
    super(app);
    this.message = message;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.createEl("h2", { text: "Generating Cheatsheet" });

    const progressContainer = contentEl.createDiv({
      attr: {
        style:
          "display: flex; flex-direction: column; align-items: center; justify-content: center; margin: 20px 0;",
      },
    });

    // Создаем анимированный спиннер
    const spinner = progressContainer.createDiv({
      attr: {
        style:
          "width: 50px; height: 50px; border: 5px solid #f3f3f3; border-top: 5px solid #3498db; border-radius: 50%; animation: spin 1s linear infinite; margin: 20px 0;",
      },
    });

    // Добавляем стили для анимации
    const style = document.createElement("style");
    style.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);

    // Добавляем сообщение
    progressContainer.createEl("p", {
      text: this.message,
      attr: {
        style: "text-align: center; margin: 10px 0;",
      },
    });
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
