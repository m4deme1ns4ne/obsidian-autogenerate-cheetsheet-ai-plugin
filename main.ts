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
      const command = `cd "/Users/aleksandrvolzanin/Machine learning/.obsidian/plugins/extension_ai_obsidian" && source ".venv/bin/activate" && python3 main.py "${topic}" "${content}"`;
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

    // Увеличиваем размер модального окна
    this.modalEl.style.width = "90vw";
    this.modalEl.style.height = "90vh";
    this.modalEl.style.maxWidth = "1500px";

    // Создаем контейнер для содержимого
    const container = contentEl.createDiv({
      attr: {
        style:
          "display: flex; flex-direction: column; width: 100%; height: 100%;",
      },
    });

    container.createEl("h2", { text: "Edit Cheatsheet" });

    // Создаем контейнер с разделением на две части
    const splitContainer = container.createDiv({
      attr: {
        style: "display: flex; width: 100%; height: 100%; gap: 10px;",
      },
    });

    // Левая панель для редактирования
    const editorContainer = splitContainer.createDiv({
      attr: {
        style: "flex: 1; display: flex; flex-direction: column;",
      },
    });

    // Правая панель для предпросмотра
    const previewContainer = splitContainer.createDiv({
      attr: {
        style:
          "flex: 1; display: flex; flex-direction: column; border: 1px solid #ddd; border-radius: 4px; overflow: auto;",
      },
    });

    // Добавляем заголовки для каждой панели
    editorContainer.createEl("h3", {
      text: "Редактор",
      attr: { style: "margin: 0 0 10px 0;" },
    });
    previewContainer.createEl("h3", {
      text: "Предпросмотр",
      attr: { style: "margin: 0 0 10px 0;" },
    });

    // Создаем текстовое поле в левой панели
    this.textarea = editorContainer.createEl("textarea", {
      attr: {
        style: "width: 100%; height: 100%; margin: 0; resize: none;",
      },
    }) as HTMLTextAreaElement;
    this.textarea.value = this.content;

    // Создаем область предпросмотра в правой панели
    this.previewEl = previewContainer.createDiv({
      attr: {
        style: "height: 100%; padding: 10px; overflow-y: auto;",
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
        style: "display: flex; justify-content: flex-end; margin-top: 10px;",
      },
    });

    const button = buttonContainer.createEl("button", { text: "Save" });
    button.style.marginTop = "10px";
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
