package com.example.check.controller;

import com.example.check.pojo.ItemCategory;
import com.example.check.service.ItemCategoryService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Item Category Controller
 */
@RestController
@RequestMapping("/api/categories")
@CrossOrigin(origins = "*")
public class ItemCategoryController {

    @Autowired
    private ItemCategoryService itemCategoryService;

    /**
     * Get category by ID
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
                result.put("message", "Category not found");
            }
        } catch (Exception e) {
            result.put("success", false);
            result.put("message", "Query failed: " + e.getMessage());
        }
        return result;
    }

    /**
     * Get category by Code
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
                result.put("message", "Category not found");
            }
        } catch (Exception e) {
            result.put("success", false);
            result.put("message", "Query failed: " + e.getMessage());
        }
        return result;
    }

    /**
     * Get all categories
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
            result.put("message", "Query failed: " + e.getMessage());
        }
        return result;
    }

    /**
     * Add category
     */
    @PostMapping
    public Map<String, Object> add(@RequestBody ItemCategory category) {
        Map<String, Object> result = new HashMap<>();
        try {
            boolean success = itemCategoryService.add(category);
            if (success) {
                result.put("success", true);
                result.put("message", "Added successfully");
                result.put("data", category);
            } else {
                result.put("success", false);
                result.put("message", "Add failed");
            }
        } catch (Exception e) {
            result.put("success", false);
            result.put("message", "Add failed: " + e.getMessage());
        }
        return result;
    }

    /**
     * Update category
     */
    @PutMapping("/{id}")
    public Map<String, Object> update(@PathVariable Integer id, @RequestBody ItemCategory category) {
        Map<String, Object> result = new HashMap<>();
        try {
            category.setId(id);
            boolean success = itemCategoryService.update(category);
            if (success) {
                result.put("success", true);
                result.put("message", "Updated successfully");
            } else {
                result.put("success", false);
                result.put("message", "Update failed");
            }
        } catch (Exception e) {
            result.put("success", false);
            result.put("message", "Update failed: " + e.getMessage());
        }
        return result;
    }

    /**
     * Delete category
     */
    @DeleteMapping("/{id}")
    public Map<String, Object> delete(@PathVariable Integer id) {
        Map<String, Object> result = new HashMap<>();
        try {
            boolean success = itemCategoryService.deleteById(id);
            if (success) {
                result.put("success", true);
                result.put("message", "Deleted successfully");
            } else {
                result.put("success", false);
                result.put("message", "Delete failed");
            }
        } catch (Exception e) {
            result.put("success", false);
            result.put("message", "Delete failed: " + e.getMessage());
        }
        return result;
    }
}
