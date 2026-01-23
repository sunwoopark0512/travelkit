package com.example.check.util;

import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

/**
 * 简易 LLM 模拟器，仅用于本地或测试环境。
 */
@Component
public class MockAiBuilderGenerator implements AiBuilderGenerator {
    @Override
    public Result generate(String idea, String theme, String tone) {
        String safeIdea = StringUtils.hasText(idea) ? idea.trim() : "一个由 AI 驱动的落地页";
        String safeTheme = StringUtils.hasText(theme) ? theme.trim() : "现代极简";
        String safeTone = StringUtils.hasText(tone) ? tone.trim() : "友好";
        String prompt = String.format("Idea:%s | Theme:%s | Tone:%s", safeIdea, safeTheme, safeTone);
        String html = buildHtml(safeIdea, safeTheme, safeTone);
        String css = "body { margin:0; font-family:'PingFang SC', 'Helvetica Neue', Arial, sans-serif; background:#f9fafb; }"
                + " .builder-shell { min-height:100vh; padding:88px 24px 48px; background:linear-gradient(180deg,#fff,#f0f4ff); }"
                + " .builder-card { max-width:960px; margin:0 auto; background:#fff; border-radius:20px; box-shadow:0 24px 40px rgba(15,23,42,0.12); padding:48px; }"
                + " .builder-hero { margin-bottom:32px; } .builder-hero-title { font-size:2.8rem; font-weight:700; color:#111827; margin-bottom:12px; }"
                + " .builder-hero-sub { font-size:1rem; color:#4b5563; line-height:1.8; }"
                + " .builder-section { margin-top:24px; } .builder-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(240px,1fr)); gap:16px; }"
                + " .builder-chip { padding:12px 16px; border-radius:999px; background:#eef2ff; color:#4338ca; font-weight:600; display:inline-block; }"
                + " .builder-footer { margin-top:32px; text-align:right; }";
        return new Result(html, css, prompt);
    }

    private String buildHtml(String idea, String theme, String tone) {
        return "<!DOCTYPE html>\n" +
                "<html lang=\"zh-CN\">\n" +
                "<head>\n" +
                "  <meta charset=\"UTF-8\">\n" +
                "  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n" +
                "  <title>" + idea + "</title>\n" +
                "</head>\n" +
                "<body class=\"builder-shell\">\n" +
                "  <section class=\"builder-card\">\n" +
                "      <div class=\"builder-hero\">\n" +
                "        <h1 class=\"builder-hero-title\">" + idea + "</h1>\n" +
                "        <p class=\"builder-hero-sub\">" + tone + "，采用“" + theme + "”风格，专为快速部署准备。</p>\n" +
                "      </div>\n" +
                "      <div class=\"builder-section\">\n" +
                "        <div class=\"builder-chip\">灵感</div>\n" +
                "        <p class=\"builder-hero-sub\">我们使用 AI 将你的 10 秒想法转成可直接部署的着陆页：</p>\n" +
                "        <ul class=\"builder-grid\">\n" +
                "          <li>简洁的 hero 区：" + idea + "</li>\n" +
                "          <li>主题色：" + theme + "</li>\n" +
                "          <li>语气：" + tone + "</li>\n" +
                "        </ul>\n" +
                "      </div>\n" +
                "      <footer class=\"builder-footer\">Powered by TravelKit AI Builder</footer>\n" +
                "  </section>\n" +
                "</body>\n" +
                "</html>";
    }
}
