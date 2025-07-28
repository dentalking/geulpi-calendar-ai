package com.geulpi.calendar.domain.entity;

import com.geulpi.calendar.domain.converter.JsonConverter;
import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Entity
@Table(name = "life_philosophies")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LifePhilosophy {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;
    
    @OneToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
    
    @OneToMany(mappedBy = "lifePhilosophy", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<LifeArea> areas = new ArrayList<>();
    
    @Convert(converter = JsonConverter.class)
    @Column(columnDefinition = "TEXT")
    private Map<String, Object> idealBalance;
    
    @OneToMany(mappedBy = "lifePhilosophy", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<TimeRule> absoluteRules = new ArrayList<>();
}