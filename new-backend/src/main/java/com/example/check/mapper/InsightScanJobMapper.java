package com.example.check.mapper;

import com.example.check.pojo.InsightScanJob;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import java.util.List;

@Mapper
public interface InsightScanJobMapper {
    int insert(InsightScanJob job);

    InsightScanJob selectById(@Param("id") Integer id);

    List<InsightScanJob> selectByUserId(@Param("userId") Integer userId);

    int update(InsightScanJob job);

    // For scheduler (find pending jobs)
    List<InsightScanJob> selectPendingJobs();
}
