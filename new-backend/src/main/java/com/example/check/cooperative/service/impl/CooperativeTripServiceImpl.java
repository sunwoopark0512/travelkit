package com.example.check.cooperative.service.impl;

import com.example.check.cooperative.dto.MemberProgressDTO;
import com.example.check.cooperative.mapper.CooperativeTripMapper;
import com.example.check.cooperative.mapper.CooperativeItemCheckMapper;
import com.example.check.cooperative.pojo.CooperativeTrip;
import com.example.check.cooperative.pojo.CooperativeTripMember;
import com.example.check.cooperative.pojo.CooperativeItemCheck;
import com.example.check.cooperative.service.CooperativeTripService;
import com.example.check.cooperative.service.CooperativeItemService;
import com.example.check.cooperative.service.CooperativeInviteService;
import com.example.check.mapper.UserMapper;
import com.example.check.pojo.User;
import org.springframework.beans.BeanUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class CooperativeTripServiceImpl implements CooperativeTripService {

    @Autowired
    private CooperativeTripMapper tripMapper;

    @Autowired
    private CooperativeItemService itemService;

    @Autowired
    private CooperativeInviteService inviteService;
    
    @Autowired
    private CooperativeItemCheckMapper checkMapper;

    @Autowired
    private UserMapper userMapper;

    @Override
    public CooperativeTrip getById(Integer id, Integer userId) {
        CooperativeTrip trip = tripMapper.selectById(id);
        
        // 如果有userId，计算该用户的查验进度
        if (trip != null && userId != null) {
            try {
                // 查询该用户在该行程中的查验记录
                List<CooperativeItemCheck> checks = checkMapper.selectByTripIdAndUserId(id, userId);
                // 查询该行程的所有物品
                List<com.example.check.cooperative.pojo.CooperativeItem> items = itemService.listByTrip(id, null);
                
                // 计算该用户的查验进度
                    Map<Integer, Integer> checkMap = checks.stream()
                        .collect(Collectors.toMap(CooperativeItemCheck::getItemId, CooperativeItemCheck::getChecked));
                    
                    int totalItems = items.size();
                    int checkedItems = (int) items.stream()
                        .filter(item -> {
                            Integer checkedValue = checkMap.get(item.getId());
                            return checkedValue != null && checkedValue == 1; // 只有checked=1才算已查验
                        })
                        .count();
                int progress = totalItems > 0 ? (int) Math.round((double) checkedItems / totalItems * 100) : 0;
                
                // 更新行程的进度信息
                trip.setTotalItems(totalItems);
                trip.setCheckedItems(checkedItems);
                trip.setProgress(progress);
            } catch (Exception e) {
                // 如果查询失败，使用默认值
                System.err.println("计算用户进度失败: " + e.getMessage());
                trip.setTotalItems(0);
                trip.setCheckedItems(0);
                trip.setProgress(0);
            }
        }
        
        return trip;
    }

    @Override
    public List<MemberProgressDTO> listMemberProgress(Integer tripId, String statusFilter) {
        List<MemberProgressDTO> progressList = tripMapper.selectMemberProgress(tripId);
        List<MemberProgressDTO> progressList1 = new ArrayList<>();
        for (int i = 0; i < progressList.size(); i++) {
            MemberProgressDTO memberProgressDTO=progressList.get(i);
            int useId=memberProgressDTO.getUserId();
            User user=userMapper.selectById(useId);
            memberProgressDTO.setMemberName(user.getName());
            memberProgressDTO.setAvatarUrl(user.getAvatar());
            progressList1.add(memberProgressDTO);
        }
        if (statusFilter == null || statusFilter.isEmpty()) {
            return progressList1;
        }
        String normalized = statusFilter.toLowerCase(Locale.ROOT);
        return progressList1.stream().filter(dto -> {
            if ("completed".equals(normalized)) {
                return Boolean.TRUE.equals(dto.getCompleted());
            }
            if ("pending".equals(normalized)) {
                return !Boolean.TRUE.equals(dto.getCompleted());
            }
            return true;
        }).collect(Collectors.toList());
    }

    @Override
    public boolean isTripCreator(Integer tripId, Integer userId) {
        CooperativeTrip trip = tripMapper.selectById(tripId);
        return trip != null && trip.getCreatorId() != null && trip.getCreatorId().equals(userId);
    }

    @Override
    public List<CooperativeTrip> listByUser(Integer userId) {
        List<CooperativeTrip> trips = tripMapper.selectByUserId(userId);
        
        // 为每个行程计算当前用户的查验进度
        if (userId != null) {
            for (CooperativeTrip trip : trips) {
                try {
                    // 查询该用户在该行程中的查验记录
                    List<CooperativeItemCheck> checks = checkMapper.selectByTripIdAndUserId(trip.getId(), userId);
                    // 查询该行程的所有物品
                    List<com.example.check.cooperative.pojo.CooperativeItem> items = itemService.listByTrip(trip.getId(), null);
                    
                    // 计算该用户的查验进度
                    Map<Integer, Integer> checkMap = checks.stream()
                        .collect(Collectors.toMap(CooperativeItemCheck::getItemId, CooperativeItemCheck::getChecked));
                    
                    int totalItems = items.size();
                    int checkedItems = (int) items.stream()
                        .filter(item -> {
                            Integer checkedValue = checkMap.get(item.getId());
                            return checkedValue != null && checkedValue == 1; // 只有checked=1才算已查验
                        })
                        .count();
                    int progress = totalItems > 0 ? (int) Math.round((double) checkedItems / totalItems * 100) : 0;
                    
                    // 更新行程的进度信息
                    trip.setTotalItems(totalItems);
                    trip.setCheckedItems(checkedItems);
                    trip.setProgress(progress);
                } catch (Exception e) {
                    // 如果查询失败，使用默认值
                    System.err.println("计算用户进度失败: " + e.getMessage());
                    trip.setTotalItems(0);
                    trip.setCheckedItems(0);
                    trip.setProgress(0);
                }
            }
        }
        
        return trips;
    }

    @Override
    public boolean createTrip(CooperativeTrip trip, Integer templateId) {
        trip.setCreatedAt(java.time.LocalDateTime.now());
        trip.setUpdatedAt(java.time.LocalDateTime.now());
        trip.setCheckedItems(0);
        trip.setTotalItems(0);
        trip.setProgress(0);
        if (trip.getStatus() == null) {
            trip.setStatus("preparing");
        }
        boolean inserted = tripMapper.insert(trip) > 0;
        if (!inserted) {
            return false;
        }
        if (templateId != null) {
            tripMapper.insertItemsFromTemplate(trip.getId(), templateId, trip.getCreatorId());
            tripMapper.touchProgress(trip.getId());
        }
        tripMapper.ensureCreatorMembership(trip.getId(), trip.getCreatorId(), trip.getCreatorId());
        return true;
    }

    @Override
    public boolean updateTripName(Integer tripId, String name) {
        return tripMapper.updateName(tripId, name) > 0;
    }

    @Override
    public boolean updateTripImg(Integer tripId, String img) {
        return tripMapper.updateImg(tripId, img) > 0;
    }

    @Override
    @Transactional
    public boolean deleteTrip(Integer tripId) {
        // 级联删除相关数据
        // 1. 删除邀请记录
        inviteService.deleteByTripId(tripId);
        // 2. 删除成员记录
        tripMapper.deleteMembersByTripId(tripId);
        // 3. 删除物品记录
        itemService.deleteByTripId(tripId);
        // 4. 删除行程
        return tripMapper.deleteById(tripId) > 0;
    }

    @Override
    public boolean addCollaborator(Integer tripId, Integer userId) {
        if (tripId == null || userId == null) {
            return false;
        }
        if (isTripMember(tripId, userId)) {
            return true;
        }
        return tripMapper.insertMember(tripId, userId, "collaborator") > 0;
    }

    @Override
    public boolean isTripMember(Integer tripId, Integer userId) {
        if (tripId == null || userId == null) {
            return false;
        }
        if (isTripCreator(tripId, userId)) {
            return true;
        }
        CooperativeTripMember member = tripMapper.selectMember(tripId, userId);
        return member != null;
    }

    @Override
    public List<CooperativeTripMember> listMembers(Integer tripId) {
        return tripMapper.selectMembers(tripId);
    }

    @Override
    public boolean updateMemberAvatar(Integer tripId, Integer userId, String avatarUrl) {
        if (tripId == null || userId == null) {
            return false;
        }
        if (!isTripMember(tripId, userId)) {
            return false;
        }
        return tripMapper.updateMemberAvatar(tripId, userId, avatarUrl) > 0;
    }

    @Override
    public boolean updateStatus(Integer tripId, String status) {
        if (tripId == null || status == null) {
            return false;
        }
        return tripMapper.updateStatus(tripId, status) > 0;
    }

    @Override
    public boolean refreshCompletionStatus(Integer tripId) {
        if (tripId == null) {
            return false;
        }
        CooperativeTrip trip = tripMapper.selectById(tripId);
        if (trip == null) {
            return false;
        }
        List<MemberProgressDTO> progressList = tripMapper.selectMemberProgress(tripId);
        if (progressList == null || progressList.isEmpty()) {
            return false;
        }
        boolean allCompleted = progressList.stream().allMatch(dto -> {
            if (dto == null) {
                return true;
            }
            int pending = dto.getPendingCount() != null ? dto.getPendingCount() : 0;
            int checked = dto.getCheckedCount() != null ? dto.getCheckedCount() : 0;
            int total = pending + checked;
            return total == 0 || pending == 0;
        });
        String status = trip.getStatus() != null ? trip.getStatus().toLowerCase() : "";
        if ("cancelled".equals(status)) {
            return false;
        }
        if (allCompleted) {
            if (!"completed".equals(status)) {
                tripMapper.updateStatus(tripId, "completed");
            }
            return true;
        } else {
            if ("completed".equals(status)) {
                tripMapper.updateStatus(tripId, "ongoing");
            }
            return false;
        }
    }
}

