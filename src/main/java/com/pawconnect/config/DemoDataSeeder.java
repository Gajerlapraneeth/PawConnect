package com.pawconnect.config;

import com.pawconnect.model.AnimalReport;
import com.pawconnect.model.AppUser;
import com.pawconnect.model.FeedingSpot;
import com.pawconnect.model.FeedingTask;
import com.pawconnect.repository.AnimalReportRepository;
import com.pawconnect.repository.AppUserRepository;
import com.pawconnect.repository.FeedingSpotRepository;
import com.pawconnect.repository.FeedingTaskRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.LocalDate;
import java.time.LocalTime;

@Configuration
public class DemoDataSeeder {
    @Bean
    CommandLineRunner seedDemoData(AppUserRepository users,
                                   FeedingSpotRepository spots,
                                   FeedingTaskRepository tasks,
                                   AnimalReportRepository reports) {
        return args -> {
            if (users.count() == 0) {
                AppUser demo = new AppUser();
                demo.setName("Demo Volunteer");
                demo.setEmail("demo@pawconnect.local");
                demo.setPassword("demo1234");
                demo.setPhone("");
                demo.setRole("VOLUNTEER");
                users.save(demo);
            }

            if (spots.count() == 0) {
                spots.save(makeSpot("Campus Gate Feeding Point", "Anurag University, Ghatkesar", "Dogs", "A suggested demo spot. Confirm local safety and permission before feeding.", "demo@pawconnect.local"));
                spots.save(makeSpot("Community Park Corner", "Ghatkesar community park", "Dogs and cats", "Keep clean water available and leave the area tidy.", "demo@pawconnect.local"));
                spots.save(makeSpot("Bus Stop Water Bowl", "Main road bus stop", "Dogs", "Check water bowls regularly and keep them away from traffic.", "demo@pawconnect.local"));
            }

            if (tasks.count() == 0 && spots.count() > 0) {
                var allSpots = spots.findAll();
                tasks.save(makeTask("Morning food and water check", allSpots.get(0).getId(), LocalDate.now().plusDays(1), LocalTime.of(7, 30), "demo@pawconnect.local"));
                if (allSpots.size() > 1) {
                    tasks.save(makeTask("Evening community feeding visit", allSpots.get(1).getId(), LocalDate.now().plusDays(1), LocalTime.of(18, 0), "demo@pawconnect.local"));
                }
            }

            if (reports.count() == 0) {
                AnimalReport report = new AnimalReport();
                report.setAnimalType("Dog");
                report.setLocation("Near the community park entrance");
                report.setDescription("Demo report: a street dog may need a check-up. Please verify the situation before taking action.");
                report.setReportedBy("demo@pawconnect.local");
                report.setContact("");
                report.setStatus("PENDING");
                reports.save(report);
            }
        };
    }

    private FeedingSpot makeSpot(String name, String location, String animalType, String description, String createdBy) {
        FeedingSpot spot = new FeedingSpot();
        spot.setName(name);
        spot.setLocation(location);
        spot.setAnimalType(animalType);
        spot.setDescription(description);
        spot.setCreatedBy(createdBy);
        return spot;
    }

    private FeedingTask makeTask(String title, Long spotId, LocalDate date, LocalTime time, String createdBy) {
        FeedingTask task = new FeedingTask();
        task.setTitle(title);
        task.setFeedingSpotId(spotId);
        task.setTaskDate(date);
        task.setTaskTime(time);
        task.setStatus("OPEN");
        task.setCreatedBy(createdBy);
        return task;
    }
}
