package com.example.check.util;

/**
 * AI 生成器接口（可以替换为真实 LLM 的实现）
 */
public interface AiBuilderGenerator {
    Result generate(String idea, String theme, String tone);

    class Result {
        private final String html;
        private final String css;
        private final String prompt;

        public Result(String html, String css, String prompt) {
            this.html = html;
            this.css = css;
            this.prompt = prompt;
        }

        public String getHtml() {
            return html;
        }

        public String getCss() {
            return css;
        }

        public String getPrompt() {
            return prompt;
        }
    }
}
