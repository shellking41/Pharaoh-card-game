package org.game.pharaohcardgame.Repository;

import org.game.pharaohcardgame.Model.DTO.Response.MinimalRoomResponse;
import org.game.pharaohcardgame.Model.Room;
import org.game.pharaohcardgame.Model.User;
import io.lettuce.core.dynamic.annotation.Param;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface RoomRepository extends JpaRepository<Room, Long> {
    boolean existsByGamemasterAndActiveTrue(User gamemaster);

    Room findByGamemasterAndActiveTrue(User gamemaster);

    @Query("""
                SELECT new org.game.pharaohcardgame.Model.DTO.Response.MinimalRoomResponse(
                    r.name,
                    r.roomId,
                    CAST(COUNT(DISTINCT p.id) + COUNT(DISTINCT b.id) AS long),
                    gs.gameStatus,
                    CASE WHEN gs.gameStatus IS NOT NULL AND gs.gameStatus != 'FINISHED' THEN true ELSE false END,
                    r.isPublic
                )
                FROM Room r
                LEFT JOIN r.participants p
                LEFT JOIN r.bots b
                LEFT JOIN r.gameSessions gs ON gs.gameStatus != 'FINISHED'
                WHERE r.active = true
                GROUP BY r.roomId, r.name, r.password, gs.gameStatus
                ORDER BY r.roomId DESC
            """)
    Page<MinimalRoomResponse> findActiveRoomsMinimal(Pageable pageable);

    @Query("SELECT r FROM Room r LEFT JOIN FETCH r.participants WHERE r.roomId = :id")
    Optional<Room> findByIdWithParticipants(@Param("id") Long id);

    @Query("SELECT r FROM Room r LEFT JOIN FETCH r.gamemaster WHERE r.roomId=:id")
    Optional<Room> findByRoomIdWithGameMaster(@Param("id") Long id);

    @Query("SELECT (SELECT COUNT(u) FROM User u WHERE u.currentRoom.roomId = :roomId) + " +
            "(SELECT COUNT(b) FROM Bot b WHERE b.room.roomId = :roomId)")
    Optional<Long> countPlayersTotal(@Param("roomId") Long roomId);

    // 1) pageable ids lekérdezés (ez a lapozás alapja)
    @Query("SELECT r.roomId FROM Room r WHERE r.active = true")
    Page<Long> findActiveRoomIds(Pageable pageable);


}
