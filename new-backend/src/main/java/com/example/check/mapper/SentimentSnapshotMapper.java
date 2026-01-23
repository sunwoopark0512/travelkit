package com.example.check.mapper;

import com.example.check.pojo.SentimentSnapshot;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import java.util.List;

@Mapper
public interface SentimentSnapshotMapper {
    int insert(SentimentSnapshot snapshot);

    List<SentimentSnapshot> selectByJobId(@Param("jobId") Integer jobId);

    void deleteByJobId(@Param("jobId") Integer jobId);
}
