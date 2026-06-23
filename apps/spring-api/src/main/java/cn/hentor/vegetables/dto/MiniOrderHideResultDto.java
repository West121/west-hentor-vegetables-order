package cn.hentor.vegetables.dto;

import java.time.LocalDateTime;

public record MiniOrderHideResultDto(LocalDateTime deletedByUserAt, String id) {}
