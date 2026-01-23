package com.example.check.controller;

import com.example.check.pojo.InsightScanJob;
import com.example.check.pojo.InsightScanRequest;
import com.example.check.pojo.InsightsDashboard;
import com.example.check.service.InsightsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/insights")
@CrossOrigin(origins = "*")
public class InsightsController {

    @Autowired
    private InsightsService insightsService;

    @PostMapping("/scan")
    public Map<String, Object> startScan(@RequestParam Integer userId,
            @RequestBody InsightScanRequest request) {
        Map<String, Object> result = new HashMap<>();
        try {
            InsightScanJob job = insightsService.startScan(userId, request.getTargetUrl());
            result.put("success", true);
            result.put("data", job);

            // To be realistic, trigger processing async or rely on scheduler.
            // For demo: we'll rely on the Scheduler running every 10s.

        } catch (Exception e) {
            result.put("success", false);
            result.put("message", e.getMessage());
        }
        return result;
    }

    @GetMapping("/dashboard/{jobId}")
    public Map<String, Object> getDashboard(@PathVariable Integer jobId) {
        Map<String, Object> result = new HashMap<>();
        try {
            InsightsDashboard dashboard = insightsService.getDashboard(jobId);
            if (dashboard != null) {
                result.put("success", true);
                result.put("data", dashboard);
            } else {
                result.put("success", false);
                result.put("message", "Job not found");
            }
        } catch (Exception e) {
            result.put("success", false);
            result.put("message", e.getMessage());
        }
        return result;
    }

    @GetMapping("/jobs")
    public Map<String, Object> getUserJobs(@RequestParam Integer userId) {
        Map<String, Object> result = new HashMap<>();
        try {
            List<InsightScanJob> jobs = insightsService.getUserJobs(userId);
            result.put("success", true);
            result.put("data", jobs);
        } catch (Exception e) {
            result.put("success", false);
            result.put("message", e.getMessage());
        }
        return result;
    }
}
