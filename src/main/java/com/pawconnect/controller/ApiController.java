package com.pawconnect.controller;

import com.pawconnect.model.AnimalReport;
import com.pawconnect.model.AppUser;
import com.pawconnect.model.FeedingSpot;
import com.pawconnect.model.FeedingTask;
import com.pawconnect.model.TaskParticipant;
import com.pawconnect.repository.AnimalReportRepository;
import com.pawconnect.repository.AppUserRepository;
import com.pawconnect.repository.FeedingSpotRepository;
import com.pawconnect.repository.FeedingTaskRepository;
import com.pawconnect.repository.TaskParticipantRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api")
public class ApiController {
    private static final String USER_SESSION_KEY = "pawconnectUserId";
    private static final List<String> REPORT_STATUSES = List.of("PENDING", "IN_PROGRESS", "RESOLVED");

    private final AppUserRepository users;
    private final FeedingSpotRepository spots;
    private final FeedingTaskRepository tasks;
    private final TaskParticipantRepository participants;
    private final AnimalReportRepository reports;
    private final PasswordEncoder passwordEncoder;

    @Value("${pawconnect.admin-email:}")
    private String adminEmail;

    public ApiController(AppUserRepository users, FeedingSpotRepository spots,
                         FeedingTaskRepository tasks, TaskParticipantRepository participants,
                         AnimalReportRepository reports, PasswordEncoder passwordEncoder) {
        this.users = users;
        this.spots = spots;
        this.tasks = tasks;
        this.participants = participants;
        this.reports = reports;
        this.passwordEncoder = passwordEncoder;
    }

    @PostMapping("/auth/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest input, HttpServletRequest request) {
        String name = clean(input.name());
        String email = clean(input.email()).toLowerCase();
        String password = input.password();
        if (name.isBlank() || email.isBlank() || password == null || password.length() < 8) {
            return badRequest("Enter your name and email, and choose a password with at least 8 characters.");
        }
        if (name.length() > 100 || email.length() > 180 || clean(input.phone()).length() > 40) {
            return badRequest("One or more fields are longer than allowed.");
        }
        if (users.existsByEmailIgnoreCase(email)) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(message("This email is already registered."));
        }

        AppUser user = new AppUser();
        user.setName(name);
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(password));
        user.setPhone(clean(input.phone()));
        user.setRole(isConfiguredAdmin(email) ? "ADMIN" : "VOLUNTEER");
        user = users.save(user);
        startSession(request, user);
        return ResponseEntity.ok(safeUser(user));
    }

    @PostMapping("/auth/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest input, HttpServletRequest request) {
        String email = clean(input.email());
        String password = input.password() == null ? "" : input.password();
        Optional<AppUser> found = users.findByEmailIgnoreCase(email);
        if (found.isEmpty() || !passwordMatches(password, found.get())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(message("Incorrect email or password."));
        }

        AppUser user = found.get();
        boolean changed = false;
        if (!isPasswordHash(user.getPassword())) {
            user.setPassword(passwordEncoder.encode(password));
            changed = true;
        }
        if (isConfiguredAdmin(user.getEmail()) && !"ADMIN".equals(user.getRole())) {
            user.setRole("ADMIN");
            changed = true;
        }
        if (changed) {
            user = users.save(user);
        }
        startSession(request, user);
        return ResponseEntity.ok(safeUser(user));
    }

    @GetMapping("/auth/me")
    public ResponseEntity<?> currentSession(HttpServletRequest request) {
        Optional<AppUser> user = currentUser(request);
        return user.<ResponseEntity<?>>map(value -> ResponseEntity.ok(safeUser(value)))
            .orElseGet(() -> ResponseEntity.ok().build());
    }

    @PostMapping("/auth/logout")
    public Map<String, String> logout(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session != null) {
            session.invalidate();
        }
        return message("You have signed out.");
    }

    @GetMapping("/users")
    public ResponseEntity<?> allUsers(HttpServletRequest request) {
        Optional<AppUser> actor = currentUser(request);
        if (actor.isEmpty()) return unauthorized("Please sign in to view volunteers.");
        if (!"ADMIN".equals(actor.get().getRole())) return forbidden();
        return ResponseEntity.ok(users.findAll().stream().map(this::safeUser).toList());
    }

    @GetMapping("/spots")
    public List<FeedingSpot> allSpots() {
        return spots.findAll();
    }

    @PostMapping("/spots")
    public ResponseEntity<?> addSpot(@RequestBody FeedingSpot spot, HttpServletRequest request) {
        Optional<AppUser> actor = currentUser(request);
        if (actor.isEmpty()) return unauthorized("Please sign in to add a feeding spot.");
        if (clean(spot.getName()).isBlank() || clean(spot.getLocation()).isBlank()) {
            return badRequest("Spot name and location are required.");
        }
        if (spot.getName().length() > 120 || spot.getLocation().length() > 200
                || clean(spot.getDescription()).length() > 500) {
            return badRequest("One or more fields are longer than allowed.");
        }
        spot.setId(null);
        spot.setCreatedBy(actor.get().getEmail());
        return ResponseEntity.ok(spots.save(spot));
    }

    @DeleteMapping("/spots/{id}")
    public ResponseEntity<?> deleteSpot(@PathVariable Long id, HttpServletRequest request) {
        Optional<AppUser> actor = currentUser(request);
        if (actor.isEmpty()) return unauthorized("Please sign in to remove a feeding spot.");
        if (!"ADMIN".equals(actor.get().getRole())) return forbidden();
        if (!spots.existsById(id)) return ResponseEntity.notFound().build();
        spots.deleteById(id);
        return ResponseEntity.ok(message("Feeding spot deleted."));
    }

    @GetMapping("/tasks")
    public List<Map<String, Object>> allTasks() {
        return tasks.findAll().stream().map(task -> {
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("id", task.getId());
            result.put("title", task.getTitle());
            result.put("feedingSpotId", task.getFeedingSpotId());
            result.put("taskDate", task.getTaskDate());
            result.put("taskTime", task.getTaskTime());
            result.put("status", task.getStatus());
            result.put("createdBy", task.getCreatedBy());
            result.put("participants", participants.findByTaskId(task.getId()).size());
            return result;
        }).toList();
    }

    @PostMapping("/tasks")
    public ResponseEntity<?> addTask(@RequestBody FeedingTask task, HttpServletRequest request) {
        Optional<AppUser> actor = currentUser(request);
        if (actor.isEmpty()) return unauthorized("Please sign in to create a feeding visit.");
        if (clean(task.getTitle()).isBlank() || task.getFeedingSpotId() == null) {
            return badRequest("Visit title and feeding spot are required.");
        }
        if (task.getTitle().length() > 140 || !spots.existsById(task.getFeedingSpotId())) {
            return badRequest("Enter a valid title and choose an existing feeding spot.");
        }
        task.setId(null);
        task.setStatus("OPEN");
        task.setCreatedBy(actor.get().getEmail());
        return ResponseEntity.ok(tasks.save(task));
    }

    @PostMapping("/tasks/{id}/join")
    public ResponseEntity<?> joinTask(@PathVariable Long id, HttpServletRequest request) {
        Optional<AppUser> actor = currentUser(request);
        if (actor.isEmpty()) return unauthorized("Please sign in to join a feeding visit.");
        if (!tasks.existsById(id)) return ResponseEntity.notFound().build();
        String email = actor.get().getEmail();
        if (participants.existsByTaskIdAndUserEmail(id, email)) {
            return badRequest("You have already joined this visit.");
        }
        TaskParticipant participant = new TaskParticipant();
        participant.setTaskId(id);
        participant.setUserEmail(email);
        participants.save(participant);
        return ResponseEntity.ok(message("You joined the feeding visit. Thank you!"));
    }

    @PatchMapping("/tasks/{id}/complete")
    public ResponseEntity<?> completeTask(@PathVariable Long id, HttpServletRequest request) {
        if (currentUser(request).isEmpty()) return unauthorized("Please sign in to update a feeding visit.");
        Optional<FeedingTask> task = tasks.findById(id);
        if (task.isEmpty()) return ResponseEntity.notFound().build();
        task.get().setStatus("COMPLETED");
        return ResponseEntity.ok(tasks.save(task.get()));
    }

    @GetMapping("/reports")
    public List<AnimalReport> allReports() {
        return reports.findAll();
    }

    @PostMapping("/reports")
    public ResponseEntity<?> addReport(@RequestBody AnimalReport report, HttpServletRequest request) {
        Optional<AppUser> actor = currentUser(request);
        if (actor.isEmpty()) return unauthorized("Please sign in to submit a welfare report.");
        if (clean(report.getAnimalType()).isBlank() || clean(report.getDescription()).isBlank()
                || clean(report.getLocation()).isBlank()) {
            return badRequest("Animal type, description, and location are required.");
        }
        if (report.getLocation().length() > 200 || report.getDescription().length() > 2000
                || clean(report.getContact()).length() > 80) {
            return badRequest("One or more fields are longer than allowed.");
        }
        report.setId(null);
        report.setStatus("PENDING");
        report.setReportedBy(actor.get().getEmail());
        return ResponseEntity.ok(reports.save(report));
    }

    @PatchMapping("/reports/{id}/status")
    public ResponseEntity<?> updateReport(@PathVariable Long id, @RequestBody StatusRequest input,
                                          HttpServletRequest request) {
        Optional<AppUser> actor = currentUser(request);
        if (actor.isEmpty()) return unauthorized("Please sign in to update reports.");
        if (!"ADMIN".equals(actor.get().getRole())) return forbidden();
        Optional<AnimalReport> report = reports.findById(id);
        if (report.isEmpty()) return ResponseEntity.notFound().build();
        String status = clean(input.status()).toUpperCase();
        if (!REPORT_STATUSES.contains(status)) {
            return badRequest("Choose Pending, In progress, or Resolved.");
        }
        report.get().setStatus(status);
        return ResponseEntity.ok(reports.save(report.get()));
    }

    @DeleteMapping("/reports/{id}")
    public ResponseEntity<?> deleteReport(@PathVariable Long id, HttpServletRequest request) {
        Optional<AppUser> actor = currentUser(request);
        if (actor.isEmpty()) return unauthorized("Please sign in to delete reports.");
        if (!"ADMIN".equals(actor.get().getRole())) return forbidden();
        if (!reports.existsById(id)) return ResponseEntity.notFound().build();
        reports.deleteById(id);
        return ResponseEntity.ok(message("Report deleted."));
    }

    @GetMapping("/stats")
    public Map<String, Long> stats() {
        long pendingReports = reports.findAll().stream()
                .filter(report -> "PENDING".equals(report.getStatus())).count();
        return Map.of("volunteers", users.count(), "feedingSpots", spots.count(),
                "feedingTasks", tasks.count(), "animalReports", reports.count(),
                "pendingReports", pendingReports);
    }

    private void startSession(HttpServletRequest request, AppUser user) {
        request.getSession(true).setAttribute(USER_SESSION_KEY, user.getId());
        request.changeSessionId();
    }

    private Optional<AppUser> currentUser(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session == null) return Optional.empty();
        Object userId = session.getAttribute(USER_SESSION_KEY);
        return userId instanceof Long id ? users.findById(id) : Optional.empty();
    }

    private boolean passwordMatches(String rawPassword, AppUser user) {
        String storedPassword = user.getPassword();
        if (storedPassword == null) return false;
        return isPasswordHash(storedPassword)
                ? passwordEncoder.matches(rawPassword, storedPassword)
                : storedPassword.equals(rawPassword);
    }

    private boolean isPasswordHash(String password) {
        return password != null && password.startsWith("$2");
    }

    private Map<String, Object> safeUser(AppUser user) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("id", user.getId());
        result.put("name", user.getName());
        result.put("email", user.getEmail());
        result.put("phone", user.getPhone());
        result.put("role", user.getRole());
        return result;
    }

    private String clean(String value) {
        return value == null ? "" : value.trim();
    }

    private Map<String, String> message(String value) {
        return Map.of("message", value);
    }

    private ResponseEntity<Map<String, String>> badRequest(String value) {
        return ResponseEntity.badRequest().body(message(value));
    }

    private ResponseEntity<Map<String, String>> unauthorized(String value) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(message(value));
    }

    private ResponseEntity<Map<String, String>> forbidden() {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(message("Administrator access is required for this action."));
    }

    private boolean isConfiguredAdmin(String email) {
        return adminEmail != null && !adminEmail.isBlank() && adminEmail.equalsIgnoreCase(email);
    }

    public record RegisterRequest(String name, String email, String password, String phone) {}
    public record LoginRequest(String email, String password) {}
    public record StatusRequest(String status) {}
}