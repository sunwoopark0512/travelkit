package com.example.check.mapper;

import com.example.check.pojo.CompetitivePosition;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import java.util.List;

@Mapper
public interface CompetitivePositionMapper {
    int insert(CompetitivePosition position);

    List<CompetitivePosition> selectByJobId(@Param("jobId") Integer jobId);

    void deleteByJobId(@Param("jobId") Integer jobId);
}
