package com.example.check.service;

import com.example.check.pojo.InsightScanJob;
import com.example.check.pojo.InsightsDashboard;

import java.util.List;

public interface InsightsService {
    /**
     * Start a new scan job for a target URL
     */
    InsightScanJob startScan(Integer userId, String targetUrl);

    /**
     * Get the dashboard data for a job
     */
    InsightsDashboard getDashboard(Integer jobId);

    /**
     * Get recent jobs for a user
     */
    List<InsightScanJob> getUserJobs(Integer userId);

    /**
     * Process pending jobs (called by scheduler)
     */
    void processPendingJobs();
}
