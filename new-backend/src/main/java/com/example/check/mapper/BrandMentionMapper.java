package com.example.check.mapper;

import com.example.check.pojo.BrandMention;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import java.util.List;

@Mapper
public interface BrandMentionMapper {
    int insert(BrandMention mention);

    List<BrandMention> selectByJobId(@Param("jobId") Integer jobId);

    void deleteByJobId(@Param("jobId") Integer jobId);
}
