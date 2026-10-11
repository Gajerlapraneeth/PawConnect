package com.pawconnect.repository;
import com.pawconnect.model.TaskParticipant; import org.springframework.data.jpa.repository.JpaRepository; import java.util.List;
public interface TaskParticipantRepository extends JpaRepository<TaskParticipant,Long>{ boolean existsByTaskIdAndUserEmail(Long taskId,String userEmail); List<TaskParticipant> findByTaskId(Long taskId); }
