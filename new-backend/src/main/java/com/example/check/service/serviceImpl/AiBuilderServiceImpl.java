package com.example.check.service.serviceImpl;

import com.example.check.mapper.AiBuilderPreviewMapper;
import com.example.check.pojo.AiBuilderDeployRequest;
import com.example.check.pojo.AiBuilderPreview;
import com.example.check.pojo.AiBuilderRequest;
import com.example.check.service.AiBuilderService;
import com.example.check.util.AiBuilderGenerator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import java.time.LocalDateTime;

/**
 * AI 站点生成服务的默认实现
 */
@Service
public class AiBuilderServiceImpl implements AiBuilderService {
    private static final Logger logger = LoggerFactory.getLogger(AiBuilderServiceImpl.class);
    private static final int STATUS_PENDING = 0;
    private static final int STATUS_READY = 1;
    private static final int STATUS_DEPLOYED = 2;
    private static final int STATUS_FAILED = -1;
    @Autowired
    private AiBuilderPreviewMapper previewMapper;
    @Autowired
    private AiBuilderGenerator builderGenerator;

    @Override
    public AiBuilderPreview createPreview(Integer userId, AiBuilderRequest request) {
        AiBuilderPreview preview = new AiBuilderPreview();
        preview.setUserId(userId);
        preview.setTitle(StringUtils.hasText(request.getTitle()) ? request.getTitle().trim() : "AI 助手站点");
        preview.setIdea(StringUtils.hasText(request.getIdea()) ? request.getIdea().trim() : "一个 10 秒的网站想法");
        preview.setTheme(request.getTheme());
        preview.setTone(request.getTone());
        preview.setStatus(STATUS_PENDING);
        LocalDateTime now = LocalDateTime.now();
        preview.setCreatedAt(now);
        preview.setUpdatedAt(now);
        previewMapper.insert(preview);
        try {
            long start = System.currentTimeMillis();
            AiBuilderGenerator.Result result = builderGenerator.generate(preview.getIdea(), preview.getTheme(),
                    preview.getTone());
            long elapsed = System.currentTimeMillis() - start;
            preview.setHtml(result.getHtml());
            preview.setCss(result.getCss());
            preview.setPrompt(result.getPrompt());
            preview.setGenerationTimeMs(elapsed);
            preview.setStatus(STATUS_READY);
        } catch (Exception ex) {
            logger.error("AI 生成失败", ex);
            preview.setStatus(STATUS_FAILED);
            preview.setErrorMessage(ex.getMessage());
        }
        preview.setUpdatedAt(LocalDateTime.now());
        previewMapper.update(preview);
        return preview;
    }

    @Override
    public AiBuilderPreview getPreview(Integer id) {
        return previewMapper.selectById(id);
    }

    @Override
    public boolean deployPreview(Integer id, AiBuilderDeployRequest request) {
        if (request == null) {
            request = new AiBuilderDeployRequest();
        }
        AiBuilderPreview preview = previewMapper.selectById(id);
        if (preview == null || preview.getStatus() == null || preview.getStatus() < STATUS_READY) {
            return false;
        }
        String platform = StringUtils.hasText(request.getPlatform()) ? request.getPlatform().trim().toLowerCase()
                : "sandbox";
        String deploymentUrl;
        switch (platform) {
            case "netlify":
                deploymentUrl = String.format("https://app.netlify.com/sites/travelkit-builder-%d/overview", id);
                break;
            case "vercel":
                deploymentUrl = String.format("https://vercel.com/travelkit/builder/%d", id);
                break;
            default:
                deploymentUrl = String.format("https://preview.travelkit.ai/builder/%d", id);
        }
        preview.setStatus(STATUS_DEPLOYED);
        preview.setDeploymentUrl(deploymentUrl);
        preview.setPlatform(platform);
        preview.setUpdatedAt(LocalDateTime.now());
        previewMapper.update(preview);
        return true;
    }
}
