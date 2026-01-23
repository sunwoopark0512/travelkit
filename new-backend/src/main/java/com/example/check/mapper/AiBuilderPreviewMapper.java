package com.example.check.mapper;

import com.example.check.pojo.AiBuilderPreview;
import org.apache.ibatis.annotations.Mapper;

/**
 * AI 站点预览 Mapper
 */
@Mapper
public interface AiBuilderPreviewMapper {
    int insert(AiBuilderPreview preview);

    AiBuilderPreview selectById(Integer id);

    int update(AiBuilderPreview preview);
}
