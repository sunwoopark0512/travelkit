package com.example.check.cooperative.pojo;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonIgnore;
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
    
    // 临时字段，用于返回给前端，表示当前用户的查验状态（从cooperative_item_checks表查询）
    // 不映射到数据库，使用transient关键字
    private transient Boolean checked;
    
    // 临时字段，用于返回给前端，表示当前用户的查验状态值（0=未查验, 1=已携带, 2=已跳过）
    // 不映射到数据库，使用transient关键字
    private transient Integer checkedStatus;
    
    // 临时字段，用于返回给前端，表示添加者的姓名（从users表查询）
    // 不映射到数据库，使用transient关键字
    private transient String addedByName;
}

