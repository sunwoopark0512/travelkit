package com.example.check.controller;

import com.example.check.pojo.AiBuilderDeployRequest;
import com.example.check.pojo.AiBuilderPreview;
import com.example.check.pojo.AiBuilderRequest;
import com.example.check.service.AiBuilderService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;
import java.util.HashMap;
import java.util.Map;

/**
 * AI 站点生成控制器
 */
@RestController
@RequestMapping("/api/builder")
@CrossOrigin(origins = "*")
public class AiBuilderController {
    @Autowired
    private AiBuilderService aiBuilderService;

    @PostMapping("/ideas")
    public Map<String, Object> createIdea(@RequestParam Integer userId,
            @RequestBody(required = false) AiBuilderRequest request) {
        Map<String, Object> result = new HashMap<>();
        if (request == null || !StringUtils.hasText(request.getIdea())) {
            result.put("success", false);
            result.put("message", "请提供想法说明");
            return result;
        }
        try {
            AiBuilderPreview preview = aiBuilderService.createPreview(userId, request);
            result.put("success", true);
            result.put("data", preview);
        } catch (Exception ex) {
            result.put("success", false);
            result.put("message", "生成失败：" + ex.getMessage());
        }
        return result;
    }

    @GetMapping("/previews/{id}")
    public Map<String, Object> getPreview(@PathVariable Integer id) {
        Map<String, Object> result = new HashMap<>();
        try {
            AiBuilderPreview preview = aiBuilderService.getPreview(id);
            if (preview == null) {
                result.put("success", false);
                result.put("message", "预览未找到");
            } else {
                result.put("success", true);
                result.put("data", preview);
            }
        } catch (Exception ex) {
            result.put("success", false);
            result.put("message", "查询失败：" + ex.getMessage());
        }
        return result;
    }

    @PostMapping("/deploy/{id}")
    public Map<String, Object> deploy(@PathVariable Integer id,
            @RequestBody(required = false) AiBuilderDeployRequest request) {
        Map<String, Object> result = new HashMap<>();
        try {
            boolean deployed = aiBuilderService.deployPreview(id, request);
            if (deployed) {
                AiBuilderPreview preview = aiBuilderService.getPreview(id);
                result.put("success", true);
                result.put("message", "部署成功");
                result.put("data", preview);
            } else {
                result.put("success", false);
                result.put("message", "部署失败，请先生成预览");
            }
        } catch (Exception ex) {
            result.put("success", false);
            result.put("message", "部署失败：" + ex.getMessage());
        }
        return result;
    }
}
