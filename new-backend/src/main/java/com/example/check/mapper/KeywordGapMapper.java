package com.example.check.mapper;

import com.example.check.pojo.KeywordGap;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import java.util.List;

@Mapper
public interface KeywordGapMapper {
    int insert(KeywordGap keyword);

    List<KeywordGap> selectByJobId(@Param("jobId") Integer jobId);

    void deleteByJobId(@Param("jobId") Integer jobId);
}
