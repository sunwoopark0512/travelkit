package com.example.check.controller;

import com.example.check.pojo.ItemCategory;
import com.example.check.service.ItemCategoryService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 物品分类控制器
 */
@RestController
@RequestMapping("/api/categories")
@CrossOrigin(origins = "*")
public class ItemCategoryController {
    
    @Autowired
    private ItemCategoryService itemCategoryService;
    
    /**
     * 根据ID查询分类
     */
    @GetMapping("/{id}")
    public Map<String, Object> getById(@PathVariable Integer id) {
        Map<String, Object> result = new HashMap<>();
        try {
            ItemCategory category = itemCategoryService.getById(id);
            if (category != null) {
                result.put("success", true);
                result.put("data", category);
            } else {
                result.put("success", false);
                result.put("message", "分类不存在");
            }
        } catch (Exception e) {
            result.put("success", false);
            result.put("message", "查询失败：" + e.getMessage());
        }
        return result;
    }
    
    /**
     * 根据代码查询分类
     */
    @GetMapping("/code/{code}")
    public Map<String, Object> getByCode(@PathVariable String code) {
        Map<String, Object> result = new HashMap<>();
        try {
            ItemCategory category = itemCategoryService.getByCode(code);
            if (category != null) {
                result.put("success", true);
                result.put("data", category);
            } else {
                result.put("success", false);
                result.put("message", "分类不存在");
            }
        } catch (Exception e) {
            result.put("success", false);
            result.put("message", "查询失败：" + e.getMessage());
        }
        return result;
    }
    
    /**
     * 查询所有分类
     */
    @GetMapping("/all")
    public Map<String, Object> getAll() {
        Map<String, Object> result = new HashMap<>();
        try {
            List<ItemCategory> categories = itemCategoryService.getAll();
            result.put("success", true);
            result.put("data", categories);
        } catch (Exception e) {
            result.put("success", false);
            result.put("message", "查询失败：" + e.getMessage());
        }
        return result;
    }
    
    /**
     * 添加分类
     */
    @PostMapping
    public Map<String, Object> add(@RequestBody ItemCategory category) {
        Map<String, Object> result = new HashMap<>();
        try {
            boolean success = itemCategoryService.add(category);
            if (success) {
                result.put("success", true);
                result.put("message", "添加成功");
                result.put("data", category);
            } else {
                result.put("success", false);
                result.put("message", "添加失败");
            }
        } catch (Exception e) {
            result.put("success", false);
            result.put("message", "添加失败：" + e.getMessage());
        }
        return result;
    }
    
    /**
     * 更新分类
     */
    @PutMapping("/{id}")
    public Map<String, Object> update(@PathVariable Integer id, @RequestBody ItemCategory category) {
        Map<String, Object> result = new HashMap<>();
        try {
            category.setId(id);
            boolean success = itemCategoryService.update(category);
            if (success) {
                result.put("success", true);
                result.put("message", "更新成功");
            } else {
                result.put("success", false);
                result.put("message", "更新失败");
            }
        } catch (Exception e) {
            result.put("success", false);
            result.put("message", "更新失败：" + e.getMessage());
        }
        return result;
    }
    
    /**
     * 删除分类
     */
    @DeleteMapping("/{id}")
    public Map<String, Object> delete(@PathVariable Integer id) {
        Map<String, Object> result = new HashMap<>();
        try {
            boolean success = itemCategoryService.deleteById(id);
            if (success) {
                result.put("success", true);
                result.put("message", "删除成功");
            } else {
                result.put("success", false);
                result.put("message", "删除失败");
            }
        } catch (Exception e) {
            result.put("success", false);
            result.put("message", "删除失败：" + e.getMessage());
        }
        return result;
    }
}
