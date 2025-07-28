package com.geulpi.calendar.resolver;

import com.geulpi.calendar.domain.entity.Event;
import com.geulpi.calendar.domain.entity.Suggestion;
import com.geulpi.calendar.domain.entity.Insight;
import com.geulpi.calendar.dto.DashboardUpdate;
import com.geulpi.calendar.dto.BalanceAlert;
import com.geulpi.calendar.service.SubscriptionService;
import lombok.RequiredArgsConstructor;
import org.reactivestreams.Publisher;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.SubscriptionMapping;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Controller;

@Controller
@RequiredArgsConstructor
public class SubscriptionResolver {
    
    private final SubscriptionService subscriptionService;
    
    @SubscriptionMapping
    @PreAuthorize("isAuthenticated()")
    public Publisher<Event> eventUpdated(@Argument String userId) {
        return subscriptionService.subscribeToEventUpdates(userId);
    }
    
    @SubscriptionMapping
    @PreAuthorize("isAuthenticated()")
    public Publisher<Suggestion> newSuggestion(@Argument String userId) {
        return subscriptionService.subscribeToNewSuggestions(userId);
    }
    
    @SubscriptionMapping
    @PreAuthorize("isAuthenticated()")
    public Publisher<Insight> insightGenerated(@Argument String userId) {
        return subscriptionService.subscribeToInsights(userId);
    }
    
    @SubscriptionMapping
    @PreAuthorize("isAuthenticated()")
    public Publisher<DashboardUpdate> dashboardUpdates(@Argument String userId) {
        return subscriptionService.subscribeToDashboardUpdates(userId);
    }
    
    @SubscriptionMapping
    @PreAuthorize("isAuthenticated()")
    public Publisher<BalanceAlert> balanceAlerts(@Argument String userId) {
        return subscriptionService.subscribeToBalanceAlerts(userId);
    }
}