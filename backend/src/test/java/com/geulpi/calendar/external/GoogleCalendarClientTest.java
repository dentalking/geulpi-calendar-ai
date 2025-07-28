package com.geulpi.calendar.external;

import com.geulpi.calendar.domain.entity.OAuth2Token;
import com.geulpi.calendar.domain.entity.User;
import com.geulpi.calendar.repository.OAuth2TokenRepository;
import com.geulpi.calendar.util.TestDataFactory;
import com.google.api.client.googleapis.auth.oauth2.GoogleRefreshTokenRequest;
import com.google.api.client.googleapis.auth.oauth2.GoogleTokenResponse;
import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.testing.http.MockHttpTransport;
import com.google.api.client.util.DateTime;
import com.google.api.services.calendar.Calendar;
import com.google.api.services.calendar.model.CalendarList;
import com.google.api.services.calendar.model.CalendarListEntry;
import com.google.api.services.calendar.model.Event;
import com.google.api.services.calendar.model.Events;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.io.IOException;
import java.security.GeneralSecurityException;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class GoogleCalendarClientTest {
    
    @Mock
    private OAuth2TokenRepository oauth2TokenRepository;
    
    @Mock
    private Calendar mockCalendar;
    
    @Mock
    private Calendar.CalendarList mockCalendarList;
    
    @Mock
    private Calendar.CalendarList.List mockCalendarListRequest;
    
    @Mock
    private Calendar.Events mockEvents;
    
    @Mock
    private Calendar.Events.List mockEventsRequest;
    
    @InjectMocks
    private GoogleCalendarClient googleCalendarClient;
    
    private User testUser;
    private OAuth2Token validToken;
    private OAuth2Token expiredToken;
    private OAuth2Token expiredTokenWithRefresh;
    
    @BeforeEach
    void setUp() {
        testUser = TestDataFactory.createTestUser("test@example.com", "Test User");
        testUser.setId("test-user-id");
        
        validToken = TestDataFactory.createTestOAuth2Token(testUser, "google");
        validToken.setId("valid-token-id");
        validToken.setAccessToken("valid-access-token");
        validToken.setRefreshToken("valid-refresh-token");
        validToken.setExpiresAt(LocalDateTime.now().plusHours(1));
        
        expiredToken = TestDataFactory.createTestOAuth2Token(testUser, "google");
        expiredToken.setId("expired-token-id");
        expiredToken.setAccessToken("expired-access-token");
        expiredToken.setRefreshToken(null); // No refresh token
        expiredToken.setExpiresAt(LocalDateTime.now().minusHours(1));
        
        expiredTokenWithRefresh = TestDataFactory.createTestOAuth2Token(testUser, "google");
        expiredTokenWithRefresh.setId("expired-with-refresh-token-id");
        expiredTokenWithRefresh.setAccessToken("expired-access-token");
        expiredTokenWithRefresh.setRefreshToken("valid-refresh-token");
        expiredTokenWithRefresh.setExpiresAt(LocalDateTime.now().minusHours(1));
        
        // Set required configuration properties
        ReflectionTestUtils.setField(googleCalendarClient, "clientId", "test-client-id");
        ReflectionTestUtils.setField(googleCalendarClient, "clientSecret", "test-client-secret");
    }
    
    @Test
    void getCalendarService_WithValidToken_ReturnsCalendarService() throws Exception {
        when(oauth2TokenRepository.findByUserIdAndProvider(testUser.getId(), "google"))
                .thenReturn(Optional.of(validToken));
        
        try (MockedStatic<GoogleNetHttpTransport> mockedTransport = mockStatic(GoogleNetHttpTransport.class)) {
            NetHttpTransport mockTransport = mock(NetHttpTransport.class);
            mockedTransport.when(GoogleNetHttpTransport::newTrustedTransport)
                    .thenReturn(mockTransport);
            
            Calendar result = googleCalendarClient.getCalendarService(testUser);
            
            assertThat(result).isNotNull();
            verify(oauth2TokenRepository).findByUserIdAndProvider(testUser.getId(), "google");
        }
    }
    
    @Test
    void getCalendarService_WithExpiredTokenAndRefreshToken_RefreshesAndReturnsService() throws Exception {
        when(oauth2TokenRepository.findByUserIdAndProvider(testUser.getId(), "google"))
                .thenReturn(Optional.of(expiredTokenWithRefresh));
        
        GoogleTokenResponse mockTokenResponse = mock(GoogleTokenResponse.class);
        when(mockTokenResponse.getAccessToken()).thenReturn("new-access-token");
        when(mockTokenResponse.getExpiresInSeconds()).thenReturn(3600L);
        when(mockTokenResponse.getRefreshToken()).thenReturn("new-refresh-token");
        
        try (MockedStatic<GoogleNetHttpTransport> mockedTransport = mockStatic(GoogleNetHttpTransport.class);
             MockedStatic<GoogleRefreshTokenRequest> mockedRequest = mockStatic(GoogleRefreshTokenRequest.class)) {
            
            NetHttpTransport mockTransport = mock(NetHttpTransport.class);
            mockedTransport.when(GoogleNetHttpTransport::newTrustedTransport)
                    .thenReturn(mockTransport);
            
            GoogleRefreshTokenRequest mockRefreshRequest = mock(GoogleRefreshTokenRequest.class);
            mockedRequest.when(() -> new GoogleRefreshTokenRequest(
                    any(NetHttpTransport.class),
                    any(),
                    anyString(),
                    anyString(),
                    anyString()
            )).thenReturn(mockRefreshRequest);
            
            when(mockRefreshRequest.execute()).thenReturn(mockTokenResponse);
            when(oauth2TokenRepository.save(any(OAuth2Token.class))).thenReturn(expiredTokenWithRefresh);
            
            Calendar result = googleCalendarClient.getCalendarService(testUser);
            
            assertThat(result).isNotNull();
            verify(oauth2TokenRepository).save(any(OAuth2Token.class));
            assertThat(expiredTokenWithRefresh.getAccessToken()).isEqualTo("new-access-token");
            assertThat(expiredTokenWithRefresh.getRefreshToken()).isEqualTo("new-refresh-token");
        }
    }
    
    @Test
    void getCalendarService_WithNoToken_ThrowsIllegalStateException() {
        when(oauth2TokenRepository.findByUserIdAndProvider(testUser.getId(), "google"))
                .thenReturn(Optional.empty());
        
        assertThatThrownBy(() -> googleCalendarClient.getCalendarService(testUser))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("Google OAuth2 token not found for user");
    }
    
    @Test
    void getCalendarService_WithExpiredTokenAndNoRefreshToken_UsesExpiredToken() throws Exception {
        when(oauth2TokenRepository.findByUserIdAndProvider(testUser.getId(), "google"))
                .thenReturn(Optional.of(expiredToken));
        
        try (MockedStatic<GoogleNetHttpTransport> mockedTransport = mockStatic(GoogleNetHttpTransport.class)) {
            NetHttpTransport mockTransport = mock(NetHttpTransport.class);
            mockedTransport.when(GoogleNetHttpTransport::newTrustedTransport)
                    .thenReturn(mockTransport);
            
            Calendar result = googleCalendarClient.getCalendarService(testUser);
            
            assertThat(result).isNotNull();
            // Should not attempt to refresh since no refresh token
            verify(oauth2TokenRepository, never()).save(any(OAuth2Token.class));
        }
    }
    
    @Test
    void getUserCalendarEvents_WithValidResponse_ReturnsEvents() throws Exception {
        LocalDateTime startTime = LocalDateTime.now();
        LocalDateTime endTime = LocalDateTime.now().plusDays(7);
        
        // Mock calendar service creation
        when(oauth2TokenRepository.findByUserIdAndProvider(testUser.getId(), "google"))
                .thenReturn(Optional.of(validToken));
        
        try (MockedStatic<GoogleNetHttpTransport> mockedTransport = mockStatic(GoogleNetHttpTransport.class)) {
            NetHttpTransport mockTransport = mock(NetHttpTransport.class);
            mockedTransport.when(GoogleNetHttpTransport::newTrustedTransport)
                    .thenReturn(mockTransport);
            
            // Mock calendar list
            CalendarListEntry calendarEntry1 = new CalendarListEntry();
            calendarEntry1.setId("calendar-1");
            calendarEntry1.setSelected(true);
            
            CalendarListEntry calendarEntry2 = new CalendarListEntry();
            calendarEntry2.setId("calendar-2");
            calendarEntry2.setSelected(true);
            
            CalendarList calendarList = new CalendarList();
            calendarList.setItems(Arrays.asList(calendarEntry1, calendarEntry2));
            
            // Mock events
            Event event1 = new Event();
            event1.setId("event-1");
            event1.setSummary("Test Event 1");
            
            Event event2 = new Event();
            event2.setId("event-2");
            event2.setSummary("Test Event 2");
            
            Events events1 = new Events();
            events1.setItems(Arrays.asList(event1));
            
            Events events2 = new Events();
            events2.setItems(Arrays.asList(event2));
            
            // Use reflection to inject the mock calendar
            try (var mockCalendarService = mockStatic(Calendar.Builder.class)) {
                Calendar.Builder mockBuilder = mock(Calendar.Builder.class);
                mockCalendarService.when(() -> new Calendar.Builder(any(), any(), any()))
                        .thenReturn(mockBuilder);
                when(mockBuilder.setApplicationName(anyString())).thenReturn(mockBuilder);
                when(mockBuilder.build()).thenReturn(mockCalendar);
                
                when(mockCalendar.calendarList()).thenReturn(mockCalendarList);
                when(mockCalendarList.list()).thenReturn(mockCalendarListRequest);
                when(mockCalendarListRequest.execute()).thenReturn(calendarList);
                
                when(mockCalendar.events()).thenReturn(mockEvents);
                when(mockEvents.list("calendar-1")).thenReturn(mockEventsRequest);
                when(mockEvents.list("calendar-2")).thenReturn(mockEventsRequest);
                
                when(mockEventsRequest.setTimeMin(any(DateTime.class))).thenReturn(mockEventsRequest);
                when(mockEventsRequest.setTimeMax(any(DateTime.class))).thenReturn(mockEventsRequest);
                when(mockEventsRequest.setOrderBy(anyString())).thenReturn(mockEventsRequest);
                when(mockEventsRequest.setSingleEvents(anyBoolean())).thenReturn(mockEventsRequest);
                when(mockEventsRequest.setMaxResults(anyInt())).thenReturn(mockEventsRequest);
                when(mockEventsRequest.execute())
                        .thenReturn(events1)
                        .thenReturn(events2);
                
                List<Event> result = googleCalendarClient.getUserCalendarEvents(testUser, startTime, endTime);
                
                assertThat(result).hasSize(2);
                assertThat(result.get(0).getSummary()).isEqualTo("Test Event 1");
                assertThat(result.get(1).getSummary()).isEqualTo("Test Event 2");
            }
        }
    }
    
    @Test
    void getUserCalendarEvents_WithUnselectedCalendars_SkipsUnselectedCalendars() throws Exception {
        LocalDateTime startTime = LocalDateTime.now();
        LocalDateTime endTime = LocalDateTime.now().plusDays(7);
        
        when(oauth2TokenRepository.findByUserIdAndProvider(testUser.getId(), "google"))
                .thenReturn(Optional.of(validToken));
        
        try (MockedStatic<GoogleNetHttpTransport> mockedTransport = mockStatic(GoogleNetHttpTransport.class)) {
            NetHttpTransport mockTransport = mock(NetHttpTransport.class);
            mockedTransport.when(GoogleNetHttpTransport::newTrustedTransport)
                    .thenReturn(mockTransport);
            
            // Create calendars with different selection states
            CalendarListEntry selectedCalendar = new CalendarListEntry();
            selectedCalendar.setId("selected-calendar");
            selectedCalendar.setSelected(true);
            
            CalendarListEntry unselectedCalendar = new CalendarListEntry();
            unselectedCalendar.setId("unselected-calendar");
            unselectedCalendar.setSelected(false);
            
            CalendarListEntry nullSelectionCalendar = new CalendarListEntry();
            nullSelectionCalendar.setId("null-selection-calendar");
            nullSelectionCalendar.setSelected(null);
            
            CalendarList calendarList = new CalendarList();
            calendarList.setItems(Arrays.asList(selectedCalendar, unselectedCalendar, nullSelectionCalendar));
            
            Event event = new Event();
            event.setId("event-1");
            event.setSummary("Selected Calendar Event");
            
            Events events = new Events();
            events.setItems(Arrays.asList(event));
            
            try (var mockCalendarService = mockStatic(Calendar.Builder.class)) {
                Calendar.Builder mockBuilder = mock(Calendar.Builder.class);
                mockCalendarService.when(() -> new Calendar.Builder(any(), any(), any()))
                        .thenReturn(mockBuilder);
                when(mockBuilder.setApplicationName(anyString())).thenReturn(mockBuilder);
                when(mockBuilder.build()).thenReturn(mockCalendar);
                
                when(mockCalendar.calendarList()).thenReturn(mockCalendarList);
                when(mockCalendarList.list()).thenReturn(mockCalendarListRequest);
                when(mockCalendarListRequest.execute()).thenReturn(calendarList);
                
                when(mockCalendar.events()).thenReturn(mockEvents);
                when(mockEvents.list("selected-calendar")).thenReturn(mockEventsRequest);
                
                when(mockEventsRequest.setTimeMin(any(DateTime.class))).thenReturn(mockEventsRequest);
                when(mockEventsRequest.setTimeMax(any(DateTime.class))).thenReturn(mockEventsRequest);
                when(mockEventsRequest.setOrderBy(anyString())).thenReturn(mockEventsRequest);
                when(mockEventsRequest.setSingleEvents(anyBoolean())).thenReturn(mockEventsRequest);
                when(mockEventsRequest.setMaxResults(anyInt())).thenReturn(mockEventsRequest);
                when(mockEventsRequest.execute()).thenReturn(events);
                
                List<Event> result = googleCalendarClient.getUserCalendarEvents(testUser, startTime, endTime);
                
                assertThat(result).hasSize(1);
                assertThat(result.get(0).getSummary()).isEqualTo("Selected Calendar Event");
                
                // Verify only selected calendar was queried
                verify(mockEvents, times(1)).list("selected-calendar");
                verify(mockEvents, never()).list("unselected-calendar");
                verify(mockEvents, never()).list("null-selection-calendar");
            }
        }
    }
    
    @Test
    void getUserCalendarEvents_WithEmptyCalendarList_ReturnsEmptyList() throws Exception {
        LocalDateTime startTime = LocalDateTime.now();
        LocalDateTime endTime = LocalDateTime.now().plusDays(7);
        
        when(oauth2TokenRepository.findByUserIdAndProvider(testUser.getId(), "google"))
                .thenReturn(Optional.of(validToken));
        
        try (MockedStatic<GoogleNetHttpTransport> mockedTransport = mockStatic(GoogleNetHttpTransport.class)) {
            NetHttpTransport mockTransport = mock(NetHttpTransport.class);
            mockedTransport.when(GoogleNetHttpTransport::newTrustedTransport)
                    .thenReturn(mockTransport);
            
            CalendarList emptyCalendarList = new CalendarList();
            emptyCalendarList.setItems(null);
            
            try (var mockCalendarService = mockStatic(Calendar.Builder.class)) {
                Calendar.Builder mockBuilder = mock(Calendar.Builder.class);
                mockCalendarService.when(() -> new Calendar.Builder(any(), any(), any()))
                        .thenReturn(mockBuilder);
                when(mockBuilder.setApplicationName(anyString())).thenReturn(mockBuilder);
                when(mockBuilder.build()).thenReturn(mockCalendar);
                
                when(mockCalendar.calendarList()).thenReturn(mockCalendarList);
                when(mockCalendarList.list()).thenReturn(mockCalendarListRequest);
                when(mockCalendarListRequest.execute()).thenReturn(emptyCalendarList);
                
                List<Event> result = googleCalendarClient.getUserCalendarEvents(testUser, startTime, endTime);
                
                assertThat(result).isEmpty();
            }
        }
    }
    
    @Test
    void getUserCalendarEvents_WithCalendarError_ContinuesWithOtherCalendars() throws Exception {
        LocalDateTime startTime = LocalDateTime.now();
        LocalDateTime endTime = LocalDateTime.now().plusDays(7);
        
        when(oauth2TokenRepository.findByUserIdAndProvider(testUser.getId(), "google"))
                .thenReturn(Optional.of(validToken));
        
        try (MockedStatic<GoogleNetHttpTransport> mockedTransport = mockStatic(GoogleNetHttpTransport.class)) {
            NetHttpTransport mockTransport = mock(NetHttpTransport.class);
            mockedTransport.when(GoogleNetHttpTransport::newTrustedTransport)
                    .thenReturn(mockTransport);
            
            CalendarListEntry workingCalendar = new CalendarListEntry();
            workingCalendar.setId("working-calendar");
            workingCalendar.setSelected(true);
            
            CalendarListEntry failingCalendar = new CalendarListEntry();
            failingCalendar.setId("failing-calendar");
            failingCalendar.setSelected(true);
            
            CalendarList calendarList = new CalendarList();
            calendarList.setItems(Arrays.asList(workingCalendar, failingCalendar));
            
            Event event = new Event();
            event.setId("event-1");
            event.setSummary("Working Calendar Event");
            
            Events events = new Events();
            events.setItems(Arrays.asList(event));
            
            try (var mockCalendarService = mockStatic(Calendar.Builder.class)) {
                Calendar.Builder mockBuilder = mock(Calendar.Builder.class);
                mockCalendarService.when(() -> new Calendar.Builder(any(), any(), any()))
                        .thenReturn(mockBuilder);
                when(mockBuilder.setApplicationName(anyString())).thenReturn(mockBuilder);
                when(mockBuilder.build()).thenReturn(mockCalendar);
                
                when(mockCalendar.calendarList()).thenReturn(mockCalendarList);
                when(mockCalendarList.list()).thenReturn(mockCalendarListRequest);
                when(mockCalendarListRequest.execute()).thenReturn(calendarList);
                
                when(mockCalendar.events()).thenReturn(mockEvents);
                
                // Working calendar request
                Calendar.Events.List workingRequest = mock(Calendar.Events.List.class);
                when(mockEvents.list("working-calendar")).thenReturn(workingRequest);
                when(workingRequest.setTimeMin(any(DateTime.class))).thenReturn(workingRequest);
                when(workingRequest.setTimeMax(any(DateTime.class))).thenReturn(workingRequest);
                when(workingRequest.setOrderBy(anyString())).thenReturn(workingRequest);
                when(workingRequest.setSingleEvents(anyBoolean())).thenReturn(workingRequest);
                when(workingRequest.setMaxResults(anyInt())).thenReturn(workingRequest);
                when(workingRequest.execute()).thenReturn(events);
                
                // Failing calendar request
                Calendar.Events.List failingRequest = mock(Calendar.Events.List.class);
                when(mockEvents.list("failing-calendar")).thenReturn(failingRequest);
                when(failingRequest.setTimeMin(any(DateTime.class))).thenReturn(failingRequest);
                when(failingRequest.setTimeMax(any(DateTime.class))).thenReturn(failingRequest);
                when(failingRequest.setOrderBy(anyString())).thenReturn(failingRequest);
                when(failingRequest.setSingleEvents(anyBoolean())).thenReturn(failingRequest);
                when(failingRequest.setMaxResults(anyInt())).thenReturn(failingRequest);
                when(failingRequest.execute()).thenThrow(new IOException("Calendar access failed"));
                
                List<Event> result = googleCalendarClient.getUserCalendarEvents(testUser, startTime, endTime);
                
                // Should return events from working calendar despite failing calendar
                assertThat(result).hasSize(1);
                assertThat(result.get(0).getSummary()).isEqualTo("Working Calendar Event");
            }
        }
    }
    
    @Test
    void getUserCalendarEvents_WithGeneralException_ThrowsRuntimeException() throws Exception {
        LocalDateTime startTime = LocalDateTime.now();
        LocalDateTime endTime = LocalDateTime.now().plusDays(7);
        
        when(oauth2TokenRepository.findByUserIdAndProvider(testUser.getId(), "google"))
                .thenThrow(new RuntimeException("Database connection failed"));
        
        assertThatThrownBy(() -> googleCalendarClient.getUserCalendarEvents(testUser, startTime, endTime))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("Failed to fetch calendar events");
    }
    
    @Test
    void getUserCalendars_WithValidToken_ReturnsCalendarList() throws Exception {
        when(oauth2TokenRepository.findByUserIdAndProvider(testUser.getId(), "google"))
                .thenReturn(Optional.of(validToken));
        
        try (MockedStatic<GoogleNetHttpTransport> mockedTransport = mockStatic(GoogleNetHttpTransport.class)) {
            NetHttpTransport mockTransport = mock(NetHttpTransport.class);
            mockedTransport.when(GoogleNetHttpTransport::newTrustedTransport)
                    .thenReturn(mockTransport);
            
            CalendarListEntry calendar1 = new CalendarListEntry();
            calendar1.setId("calendar-1");
            calendar1.setSummary("Personal Calendar");
            
            CalendarListEntry calendar2 = new CalendarListEntry();
            calendar2.setId("calendar-2");
            calendar2.setSummary("Work Calendar");
            
            CalendarList calendarList = new CalendarList();
            calendarList.setItems(Arrays.asList(calendar1, calendar2));
            
            try (var mockCalendarService = mockStatic(Calendar.Builder.class)) {
                Calendar.Builder mockBuilder = mock(Calendar.Builder.class);
                mockCalendarService.when(() -> new Calendar.Builder(any(), any(), any()))
                        .thenReturn(mockBuilder);
                when(mockBuilder.setApplicationName(anyString())).thenReturn(mockBuilder);
                when(mockBuilder.build()).thenReturn(mockCalendar);
                
                when(mockCalendar.calendarList()).thenReturn(mockCalendarList);
                when(mockCalendarList.list()).thenReturn(mockCalendarListRequest);
                when(mockCalendarListRequest.execute()).thenReturn(calendarList);
                
                List<CalendarListEntry> result = googleCalendarClient.getUserCalendars(testUser);
                
                assertThat(result).hasSize(2);
                assertThat(result.get(0).getSummary()).isEqualTo("Personal Calendar");
                assertThat(result.get(1).getSummary()).isEqualTo("Work Calendar");
            }
        }
    }
    
    @Test
    void getUserCalendars_WithException_ThrowsRuntimeException() throws Exception {
        when(oauth2TokenRepository.findByUserIdAndProvider(testUser.getId(), "google"))
                .thenThrow(new RuntimeException("Database connection failed"));
        
        assertThatThrownBy(() -> googleCalendarClient.getUserCalendars(testUser))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("Failed to fetch calendars");
    }
    
    @Test
    void refreshAccessToken_WithValidRefreshToken_UpdatesToken() throws Exception {
        GoogleTokenResponse mockTokenResponse = mock(GoogleTokenResponse.class);
        when(mockTokenResponse.getAccessToken()).thenReturn("new-access-token");
        when(mockTokenResponse.getExpiresInSeconds()).thenReturn(3600L);
        when(mockTokenResponse.getRefreshToken()).thenReturn("new-refresh-token");
        
        try (MockedStatic<GoogleNetHttpTransport> mockedTransport = mockStatic(GoogleNetHttpTransport.class);
             MockedStatic<GoogleRefreshTokenRequest> mockedRequest = mockStatic(GoogleRefreshTokenRequest.class)) {
            
            NetHttpTransport mockTransport = mock(NetHttpTransport.class);
            mockedTransport.when(GoogleNetHttpTransport::newTrustedTransport)
                    .thenReturn(mockTransport);
            
            GoogleRefreshTokenRequest mockRefreshRequest = mock(GoogleRefreshTokenRequest.class);
            mockedRequest.when(() -> new GoogleRefreshTokenRequest(
                    any(NetHttpTransport.class),
                    any(),
                    anyString(),
                    anyString(),
                    anyString()
            )).thenReturn(mockRefreshRequest);
            
            when(mockRefreshRequest.execute()).thenReturn(mockTokenResponse);
            when(oauth2TokenRepository.save(any(OAuth2Token.class))).thenReturn(expiredTokenWithRefresh);
            
            // Use reflection to call the private method
            var method = GoogleCalendarClient.class.getDeclaredMethod("refreshAccessToken", OAuth2Token.class);
            method.setAccessible(true);
            method.invoke(googleCalendarClient, expiredTokenWithRefresh);
            
            verify(oauth2TokenRepository).save(expiredTokenWithRefresh);
            assertThat(expiredTokenWithRefresh.getAccessToken()).isEqualTo("new-access-token");
            assertThat(expiredTokenWithRefresh.getRefreshToken()).isEqualTo("new-refresh-token");
            assertThat(expiredTokenWithRefresh.getExpiresAt()).isAfter(LocalDateTime.now());
        }
    }
    
    @Test
    void refreshAccessToken_WithoutNewRefreshToken_KeepsOriginalRefreshToken() throws Exception {
        String originalRefreshToken = expiredTokenWithRefresh.getRefreshToken();
        
        GoogleTokenResponse mockTokenResponse = mock(GoogleTokenResponse.class);
        when(mockTokenResponse.getAccessToken()).thenReturn("new-access-token");
        when(mockTokenResponse.getExpiresInSeconds()).thenReturn(3600L);
        when(mockTokenResponse.getRefreshToken()).thenReturn(null); // No new refresh token
        
        try (MockedStatic<GoogleNetHttpTransport> mockedTransport = mockStatic(GoogleNetHttpTransport.class);
             MockedStatic<GoogleRefreshTokenRequest> mockedRequest = mockStatic(GoogleRefreshTokenRequest.class)) {
            
            NetHttpTransport mockTransport = mock(NetHttpTransport.class);
            mockedTransport.when(GoogleNetHttpTransport::newTrustedTransport)
                    .thenReturn(mockTransport);
            
            GoogleRefreshTokenRequest mockRefreshRequest = mock(GoogleRefreshTokenRequest.class);
            mockedRequest.when(() -> new GoogleRefreshTokenRequest(
                    any(NetHttpTransport.class),
                    any(),
                    anyString(),
                    anyString(),
                    anyString()
            )).thenReturn(mockRefreshRequest);
            
            when(mockRefreshRequest.execute()).thenReturn(mockTokenResponse);
            when(oauth2TokenRepository.save(any(OAuth2Token.class))).thenReturn(expiredTokenWithRefresh);
            
            var method = GoogleCalendarClient.class.getDeclaredMethod("refreshAccessToken", OAuth2Token.class);
            method.setAccessible(true);
            method.invoke(googleCalendarClient, expiredTokenWithRefresh);
            
            verify(oauth2TokenRepository).save(expiredTokenWithRefresh);
            assertThat(expiredTokenWithRefresh.getAccessToken()).isEqualTo("new-access-token");
            assertThat(expiredTokenWithRefresh.getRefreshToken()).isEqualTo(originalRefreshToken);
        }
    }
    
    @Test
    void refreshAccessToken_WithoutExpirationTime_DoesNotUpdateExpiry() throws Exception {
        GoogleTokenResponse mockTokenResponse = mock(GoogleTokenResponse.class);
        when(mockTokenResponse.getAccessToken()).thenReturn("new-access-token");
        when(mockTokenResponse.getExpiresInSeconds()).thenReturn(null); // No expiration
        when(mockTokenResponse.getRefreshToken()).thenReturn("new-refresh-token");
        
        LocalDateTime originalExpiresAt = expiredTokenWithRefresh.getExpiresAt();
        
        try (MockedStatic<GoogleNetHttpTransport> mockedTransport = mockStatic(GoogleNetHttpTransport.class);
             MockedStatic<GoogleRefreshTokenRequest> mockedRequest = mockStatic(GoogleRefreshTokenRequest.class)) {
            
            NetHttpTransport mockTransport = mock(NetHttpTransport.class);
            mockedTransport.when(GoogleNetHttpTransport::newTrustedTransport)
                    .thenReturn(mockTransport);
            
            GoogleRefreshTokenRequest mockRefreshRequest = mock(GoogleRefreshTokenRequest.class);
            mockedRequest.when(() -> new GoogleRefreshTokenRequest(
                    any(NetHttpTransport.class),
                    any(),
                    anyString(),
                    anyString(),
                    anyString()
            )).thenReturn(mockRefreshRequest);
            
            when(mockRefreshRequest.execute()).thenReturn(mockTokenResponse);
            when(oauth2TokenRepository.save(any(OAuth2Token.class))).thenReturn(expiredTokenWithRefresh);
            
            var method = GoogleCalendarClient.class.getDeclaredMethod("refreshAccessToken", OAuth2Token.class);
            method.setAccessible(true);
            method.invoke(googleCalendarClient, expiredTokenWithRefresh);
            
            verify(oauth2TokenRepository).save(expiredTokenWithRefresh);
            assertThat(expiredTokenWithRefresh.getAccessToken()).isEqualTo("new-access-token");
            assertThat(expiredTokenWithRefresh.getExpiresAt()).isEqualTo(originalExpiresAt);
        }
    }
    
    @Test
    void refreshAccessToken_WithRefreshError_ThrowsIOException() throws Exception {
        try (MockedStatic<GoogleNetHttpTransport> mockedTransport = mockStatic(GoogleNetHttpTransport.class);
             MockedStatic<GoogleRefreshTokenRequest> mockedRequest = mockStatic(GoogleRefreshTokenRequest.class)) {
            
            NetHttpTransport mockTransport = mock(NetHttpTransport.class);
            mockedTransport.when(GoogleNetHttpTransport::newTrustedTransport)
                    .thenReturn(mockTransport);
            
            GoogleRefreshTokenRequest mockRefreshRequest = mock(GoogleRefreshTokenRequest.class);
            mockedRequest.when(() -> new GoogleRefreshTokenRequest(
                    any(NetHttpTransport.class),
                    any(),
                    anyString(),
                    anyString(),
                    anyString()
            )).thenReturn(mockRefreshRequest);
            
            when(mockRefreshRequest.execute()).thenThrow(new IOException("Refresh token expired"));
            
            var method = GoogleCalendarClient.class.getDeclaredMethod("refreshAccessToken", OAuth2Token.class);
            method.setAccessible(true);
            
            assertThatThrownBy(() -> method.invoke(googleCalendarClient, expiredTokenWithRefresh))
                    .hasCauseInstanceOf(IOException.class)
                    .hasMessageContaining("Failed to refresh access token");
            
            verify(oauth2TokenRepository, never()).save(any(OAuth2Token.class));
        }
    }
    
    @Test
    void refreshAccessToken_WithGeneralSecurityException_ThrowsIOException() throws Exception {
        try (MockedStatic<GoogleNetHttpTransport> mockedTransport = mockStatic(GoogleNetHttpTransport.class)) {
            mockedTransport.when(GoogleNetHttpTransport::newTrustedTransport)
                    .thenThrow(new GeneralSecurityException("Security error"));
            
            var method = GoogleCalendarClient.class.getDeclaredMethod("refreshAccessToken", OAuth2Token.class);
            method.setAccessible(true);
            
            assertThatThrownBy(() -> method.invoke(googleCalendarClient, expiredTokenWithRefresh))
                    .hasCauseInstanceOf(IOException.class)
                    .hasMessageContaining("Failed to refresh access token");
            
            verify(oauth2TokenRepository, never()).save(any(OAuth2Token.class));
        }
    }
    
    @Test
    void getUserCalendarEvents_WithNullEventItems_HandlesGracefully() throws Exception {
        LocalDateTime startTime = LocalDateTime.now();
        LocalDateTime endTime = LocalDateTime.now().plusDays(7);
        
        when(oauth2TokenRepository.findByUserIdAndProvider(testUser.getId(), "google"))
                .thenReturn(Optional.of(validToken));
        
        try (MockedStatic<GoogleNetHttpTransport> mockedTransport = mockStatic(GoogleNetHttpTransport.class)) {
            NetHttpTransport mockTransport = mock(NetHttpTransport.class);
            mockedTransport.when(GoogleNetHttpTransport::newTrustedTransport)
                    .thenReturn(mockTransport);
            
            CalendarListEntry calendarEntry = new CalendarListEntry();
            calendarEntry.setId("calendar-1");
            calendarEntry.setSelected(true);
            
            CalendarList calendarList = new CalendarList();
            calendarList.setItems(Arrays.asList(calendarEntry));
            
            Events eventsWithNullItems = new Events();
            eventsWithNullItems.setItems(null); // Null items list
            
            try (var mockCalendarService = mockStatic(Calendar.Builder.class)) {
                Calendar.Builder mockBuilder = mock(Calendar.Builder.class);
                mockCalendarService.when(() -> new Calendar.Builder(any(), any(), any()))
                        .thenReturn(mockBuilder);
                when(mockBuilder.setApplicationName(anyString())).thenReturn(mockBuilder);
                when(mockBuilder.build()).thenReturn(mockCalendar);
                
                when(mockCalendar.calendarList()).thenReturn(mockCalendarList);
                when(mockCalendarList.list()).thenReturn(mockCalendarListRequest);
                when(mockCalendarListRequest.execute()).thenReturn(calendarList);
                
                when(mockCalendar.events()).thenReturn(mockEvents);
                when(mockEvents.list("calendar-1")).thenReturn(mockEventsRequest);
                
                when(mockEventsRequest.setTimeMin(any(DateTime.class))).thenReturn(mockEventsRequest);
                when(mockEventsRequest.setTimeMax(any(DateTime.class))).thenReturn(mockEventsRequest);
                when(mockEventsRequest.setOrderBy(anyString())).thenReturn(mockEventsRequest);
                when(mockEventsRequest.setSingleEvents(anyBoolean())).thenReturn(mockEventsRequest);
                when(mockEventsRequest.setMaxResults(anyInt())).thenReturn(mockEventsRequest);
                when(mockEventsRequest.execute()).thenReturn(eventsWithNullItems);
                
                List<Event> result = googleCalendarClient.getUserCalendarEvents(testUser, startTime, endTime);
                
                assertThat(result).isEmpty();
            }
        }
    }
    
    @Test
    void getUserCalendarEvents_CorrectlyConvertsDateTimes() throws Exception {
        LocalDateTime startTime = LocalDateTime.of(2024, 1, 1, 9, 0);
        LocalDateTime endTime = LocalDateTime.of(2024, 1, 7, 17, 0);
        
        when(oauth2TokenRepository.findByUserIdAndProvider(testUser.getId(), "google"))
                .thenReturn(Optional.of(validToken));
        
        try (MockedStatic<GoogleNetHttpTransport> mockedTransport = mockStatic(GoogleNetHttpTransport.class)) {
            NetHttpTransport mockTransport = mock(NetHttpTransport.class);
            mockedTransport.when(GoogleNetHttpTransport::newTrustedTransport)
                    .thenReturn(mockTransport);
            
            CalendarListEntry calendarEntry = new CalendarListEntry();
            calendarEntry.setId("calendar-1");
            calendarEntry.setSelected(true);
            
            CalendarList calendarList = new CalendarList();
            calendarList.setItems(Arrays.asList(calendarEntry));
            
            Events events = new Events();
            events.setItems(Collections.emptyList());
            
            try (var mockCalendarService = mockStatic(Calendar.Builder.class)) {
                Calendar.Builder mockBuilder = mock(Calendar.Builder.class);
                mockCalendarService.when(() -> new Calendar.Builder(any(), any(), any()))
                        .thenReturn(mockBuilder);
                when(mockBuilder.setApplicationName(anyString())).thenReturn(mockBuilder);
                when(mockBuilder.build()).thenReturn(mockCalendar);
                
                when(mockCalendar.calendarList()).thenReturn(mockCalendarList);
                when(mockCalendarList.list()).thenReturn(mockCalendarListRequest);
                when(mockCalendarListRequest.execute()).thenReturn(calendarList);
                
                when(mockCalendar.events()).thenReturn(mockEvents);
                when(mockEvents.list("calendar-1")).thenReturn(mockEventsRequest);
                
                when(mockEventsRequest.setTimeMin(any(DateTime.class))).thenReturn(mockEventsRequest);
                when(mockEventsRequest.setTimeMax(any(DateTime.class))).thenReturn(mockEventsRequest);
                when(mockEventsRequest.setOrderBy(anyString())).thenReturn(mockEventsRequest);
                when(mockEventsRequest.setSingleEvents(anyBoolean())).thenReturn(mockEventsRequest);
                when(mockEventsRequest.setMaxResults(anyInt())).thenReturn(mockEventsRequest);
                when(mockEventsRequest.execute()).thenReturn(events);
                
                googleCalendarClient.getUserCalendarEvents(testUser, startTime, endTime);
                
                // Verify that setTimeMin and setTimeMax were called with correct DateTime objects
                verify(mockEventsRequest).setTimeMin(argThat(dateTime -> {
                    long expectedMillis = startTime.atZone(ZoneId.systemDefault()).toInstant().toEpochMilli();
                    return dateTime.getValue() == expectedMillis;
                }));
                
                verify(mockEventsRequest).setTimeMax(argThat(dateTime -> {
                    long expectedMillis = endTime.atZone(ZoneId.systemDefault()).toInstant().toEpochMilli();
                    return dateTime.getValue() == expectedMillis;
                }));
            }
        }
    }
}