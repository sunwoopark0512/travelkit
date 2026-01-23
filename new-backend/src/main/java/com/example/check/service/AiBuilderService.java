package com.example.check.service;

import com.example.check.pojo.AiBuilderDeployRequest;
import com.example.check.pojo.AiBuilderPreview;
import com.example.check.pojo.AiBuilderRequest;

/**
 * AI 站点生成器服务
 */
public interface AiBuilderService {
    AiBuilderPreview createPreview(Integer userId, AiBuilderRequest request);

    AiBuilderPreview getPreview(Integer id);

    boolean deployPreview(Integer id, AiBuilderDeployRequest request);
}
