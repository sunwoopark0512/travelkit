package com.example.check.cooperative.pojo;

import com.fasterxml.jackson.annotation.JsonFormat;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class CooperativeItem {
    private Integer id;
    private Integer tripId;
    private Integer addedBy;
    private Integer itemOverviewId; // 物品总览ID，关联item_overview表
    private String name;
    private Integer categoryId; // 分类ID，替代原来的category字段
    private String priority;
    private String description;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createdAt;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime updatedAt;

    // Transient field, returns user check status (from cooperative_item_checks)
    // Not mapped to DB, used transient
    private transient Boolean checked;

    // Transient field, returns check status value (0=unchecked, 1=checked,
    // 2=skipped)
    // Not mapped to DB, used transient
    private transient Integer checkedStatus;

    // Transient field, returns adder name (from users type)
    // Not mapped to DB, used transient
    private transient String addedByName;
}
