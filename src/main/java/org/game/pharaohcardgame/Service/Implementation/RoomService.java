package org.game.pharaohcardgame.Service.Implementation;

import org.game.pharaohcardgame.Authentication.JwtService;
import org.game.pharaohcardgame.Authentication.UserPrincipal;
import org.game.pharaohcardgame.Enum.GameStatus;
import org.game.pharaohcardgame.Exception.RoomNotFoundException;
import org.game.pharaohcardgame.Exception.UserNotInRoomException;
import org.game.pharaohcardgame.Model.DTO.Request.*;
import org.game.pharaohcardgame.Model.DTO.Response.*;
import org.game.pharaohcardgame.Model.DTO.ResponseMapper;
import org.game.pharaohcardgame.Model.GameSession;
import org.game.pharaohcardgame.Model.Room;
import org.game.pharaohcardgame.Model.User;
import org.game.pharaohcardgame.Repository.GameSessionRepository;
import org.game.pharaohcardgame.Repository.RoomRepository;
import org.game.pharaohcardgame.Repository.TokensRepository;
import org.game.pharaohcardgame.Repository.UserRepository;
import org.game.pharaohcardgame.Service.IAuthenticationService;
import org.game.pharaohcardgame.Service.IRoomService;
import org.game.pharaohcardgame.Service.IUserService;
import jakarta.persistence.EntityNotFoundException;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Caching;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.simp.user.SimpUserRegistry;
import org.springframework.scheduling.annotation.Async;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.CompletableFuture;

@Service
@RequiredArgsConstructor
@Slf4j

public class RoomService implements IRoomService {

    private final RoomRepository roomRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final UserRepository userRepository;
    private final TokensRepository tokensRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final AuthenticationManager authenticationManager;
    private final SimpUserRegistry simpUserRegistry;
    private final SimpMessagingTemplate simpMessagingTemplate;

    private final ResponseMapper responseMapper;
    private final IUserService userService;
    private final IAuthenticationService authenticationService;
    private final CacheManager cacheManager;
    private final GameSessionRepository gameSessionRepository;


    @Override
    @Async
    public CompletableFuture<Page<MinimalRoomResponse>> getAllRoom(int pageNum, int pageSize) {
        Page<MinimalRoomResponse> resultPage =
                roomRepository.findActiveRoomsMinimal(PageRequest.of(pageNum, pageSize));


        return CompletableFuture.completedFuture(resultPage);
    }


    @Override
    @Transactional

    public void joinRoomRequest(JoinRoomRequest joinRoomRequest, StompHeaderAccessor accessor) {
        UserPrincipal principal = (UserPrincipal) accessor.getUser();
        String userId = null;

        try {
            if (principal != null) {
                userId = principal.getUserId().toString();
            } else {
                throw new RuntimeException("User not authenticated");
            }

            Room room = roomRepository.findById(joinRoomRequest.getRoomId())
                    .orElseThrow(() -> new RoomNotFoundException("Room is not found"));

            User user = userRepository.findById(Long.valueOf(userId))
                    .orElseThrow(() -> new RuntimeException("User not found"));

            boolean isAlreadyParticipant = user != null && user.getCurrentRoom() != null &&
                    user.getCurrentRoom().getRoomId().equals(joinRoomRequest.getRoomId());

            if (isAlreadyParticipant) {
                SuccessMessageResponse response = responseMapper.createSuccessResponse(
                        false, "You are already a participant in this room");
                simpMessagingTemplate.convertAndSendToUser(
                        userId,
                        "/queue/join-response",
                        response
                );
                return;
            }

            if (isRoomFull(room)) {
                SuccessMessageResponse response = responseMapper.createSuccessResponse(
                        false, "Room is full");
                simpMessagingTemplate.convertAndSendToUser(
                        userId,
                        "/queue/join-response",
                        response
                );
                return;
            }

            if (!room.isActive()) {
                SuccessMessageResponse response = responseMapper.createSuccessResponse(
                        false, "Room is not active anymore");
                simpMessagingTemplate.convertAndSendToUser(
                        userId,
                        "/queue/join-response",
                        response);
                return;
            }

            // ÚJ ELLENŐRZÉS: Van-e már elindult játék a szobában?
            boolean hasActiveOrWaitingGame = gameSessionRepository.existsByRoomAndGameStatus(room, GameStatus.IN_PROGRESS) ||
                    gameSessionRepository.existsByRoomAndGameStatus(room, GameStatus.WAITING);

            if (hasActiveOrWaitingGame) {
                SuccessMessageResponse response = responseMapper.createSuccessResponse(
                        false, "Cannot join - game has already started or is waiting to start");
                simpMessagingTemplate.convertAndSendToUser(
                        userId,
                        "/queue/join-response",
                        response
                );
                return;
            }

            if (!passwordEncoder.matches(joinRoomRequest.getRoomPassword(), room.getPassword())) {
                throw new RuntimeException("Room password is not correct");
            }

            User gameMaster = room.getGamemaster();
            if (gameMaster == null) {
                throw new EntityNotFoundException("Game master not found");
            }

            if (simpUserRegistry.getUser(gameMaster.getId().toString()) != null) {
                JoinRequestResponse joinRequest = responseMapper.toJoinRequestResponse(
                        user,
                        room.getRoomId(),
                        joinRoomRequest.getMessage(),
                        joinRoomRequest.getUserId(),
                        joinRoomRequest.getUsername()
                );

                simpMessagingTemplate.convertAndSendToUser(
                        gameMaster.getId().toString(),
                        "/queue/join-requests",
                        joinRequest
                );

                log.info("Join request sent to game master id: {} ", gameMaster.getId());
            } else {
                SuccessMessageResponse response = responseMapper.createSuccessResponse(
                        false, "Game master currently is not available");
                log.info("Game master is offline");

                simpMessagingTemplate.convertAndSendToUser(
                        userId,
                        "/queue/join-response",
                        response
                );
                return;
            }

            SuccessMessageResponse response = responseMapper.createSuccessResponse(
                    true, "Request successfully sent to the game master");
            simpMessagingTemplate.convertAndSendToUser(
                    userId,
                    "/queue/join-response",
                    response
            );
        } catch (Exception e) {
            SuccessMessageResponse response = responseMapper.createSuccessResponse(
                    false, e.getMessage());
            log.error("Unexpected error in joinRoomRequest: {}", e.getMessage(), e);
            if (userId != null) {
                simpMessagingTemplate.convertAndSendToUser(
                        userId,
                        "/queue/join-response",
                        response
                );
            }
        }
    }

    @Override
    @Caching(
            evict = {
                    @CacheEvict(
                            value = "userStatus",
                            key = "'userStatus_' + #confirmOrDeclineJoin.getConnectingUserId()"
                    )
            }
    )
    @Transactional
    public Map<String, Object> confirmOrDeclineJoin(ConfirmOrDeclineJoin confirmOrDeclineJoin, StompHeaderAccessor accessor) {

        if (accessor.getUser() == null) {
            throw new EntityNotFoundException("User not found");
        }

        User gamemaster = userRepository.findById(Long.valueOf(accessor.getUser().getName()))
                .orElseThrow(() -> new EntityNotFoundException("User not found"));

        Room room = roomRepository.findByIdWithParticipants(confirmOrDeclineJoin.getRoomId())
                .orElseThrow(() -> new RoomNotFoundException("RoomPage is not found"));

        User user = userRepository.findById(confirmOrDeclineJoin.getConnectingUserId())
                .orElseThrow(() -> new EntityNotFoundException("User not found"));

        if (room.getGamemaster() == null || !(room.getGamemaster().getId().equals(gamemaster.getId()))) {
            throw new AccessDeniedException("User is not the gamemaster");
        }

        //cache evict
        Cache cache = cacheManager.getCache("userStatus");
        if (cache != null) {
            cache.evict("userStatus_" + confirmOrDeclineJoin.getConnectingUserId());
        }


        SuccessMessageResponse response;
        ConfirmOrDeclineJoinResponse responseToPlayer;
        Map<String, Object> resultMessage = new HashMap<>();

        if (confirmOrDeclineJoin.getConfirm()) {
            if (user.getCurrentRoom() != null) {
                // Ha már bent van másik szobában
                if (!user.getCurrentRoom().getRoomId().equals(room.getRoomId())) {
                    // User már másik szobában van
                    response = responseMapper.createSuccessResponse(
                            false,
                            "User has already joined another room"
                    );

                    simpMessagingTemplate.convertAndSendToUser(
                            String.valueOf(confirmOrDeclineJoin.getConnectingUserId()),
                            "/queue/join-response",
                            response
                    );

                    // Gamemaster értesítése
                    SuccessMessageResponse gamemasterNotification = responseMapper.createSuccessResponse(
                            false,
                            "Cannot confirm - user has already joined another room"
                    );

                    simpMessagingTemplate.convertAndSendToUser(
                            gamemaster.getId().toString(),
                            "/queue/confirm-error",
                            gamemasterNotification
                    );

                    resultMessage.put("success", false);
                    resultMessage.put("message", "User has already joined another room");

                    log.warn("Join confirmation failed - user {} already in another room", user.getId());
                    return resultMessage;
                }
                // Ha ugyanebben a szobában van már, akkor rendben van
                else {
                    response = responseMapper.createSuccessResponse(
                            false,
                            "You are already in this room"
                    );

                    simpMessagingTemplate.convertAndSendToUser(
                            String.valueOf(confirmOrDeclineJoin.getConnectingUserId()),
                            "/queue/join-response",
                            response
                    );

                    resultMessage.put("success", false);
                    resultMessage.put("message", "User is already in this room");

                    log.info("User {} already in room {}", user.getId(), room.getRoomId());
                    return resultMessage;
                }
            }

            // ✅ ELLENŐRZÉS: Van-e még hely a szobában?
            if (isRoomFull(room)) {
                response = responseMapper.createSuccessResponse(
                        false,
                        "Room is now full - cannot join"
                );

                simpMessagingTemplate.convertAndSendToUser(
                        String.valueOf(confirmOrDeclineJoin.getConnectingUserId()),
                        "/queue/join-response",
                        response
                );

                // Gamemaster értesítése
                SuccessMessageResponse gamemasterNotification = responseMapper.createSuccessResponse(
                        false,
                        "Cannot confirm - room is now full"
                );

                simpMessagingTemplate.convertAndSendToUser(
                        gamemaster.getId().toString(),
                        "/queue/confirm-error",
                        gamemasterNotification
                );

                resultMessage.put("success", false);
                resultMessage.put("message", "Room is now full");

                log.warn("Join confirmation failed - room {} is full", room.getRoomId());
                return resultMessage;
            }

            // ✅ SIKERES CSATLAKOZÁS
            room.getParticipants().add(user);
            roomRepository.save(room);
            user.setCurrentRoom(room);
            userRepository.save(user);

            responseToPlayer = responseMapper.toConfirmOrDeclineJoinResponse(
                    true, "Gamemaster confirmed your join request", room);

            simpMessagingTemplate.convertAndSend(
                    "/topic/room/" + room.getRoomId() + "/participant-update",
                    responseMapper.toRoomResponse(room)
            );

            resultMessage.put("success", true);
            resultMessage.put("message", "The user has been notified of the connection approval.");

        } else {
            // ELUTASÍTÁS
            responseToPlayer = responseMapper.toConfirmOrDeclineJoinResponse(
                    false, "Gamemaster declined your join request", null);

            resultMessage.put("success", true);
            resultMessage.put("message", "The user has been notified of the connection rejection.");
        }

        simpMessagingTemplate.convertAndSendToUser(
                String.valueOf(confirmOrDeclineJoin.getConnectingUserId()),
                "/queue/join-response",
                responseToPlayer
        );

        log.info("Join confirmation sent to {}", confirmOrDeclineJoin.getConnectingUserId());
        return resultMessage;
    }

    @Override
    @Transactional
    public MinimalRoomResponse createRoom(RoomCreationRequest createRoomRequest, StompHeaderAccessor accessor) {
        UserPrincipal principal = (UserPrincipal) accessor.getUser();
        assert principal != null;
        Long userId = principal.getUserId();

        //cache evict
        Cache cache = cacheManager.getCache("userStatus");
        if (cache != null) {
            cache.evict("userStatus_" + userId);
        }

        User gameMaster = userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("User not Found"));


        // Ellenőrzés: van-e aktív szoba, amit ez a user kezel
        boolean hasActiveRoom = roomRepository.existsByGamemasterAndActiveTrue(gameMaster);
        if (hasActiveRoom) {
            throw new IllegalStateException("You already have an active room. Close it before creating a new one.");
        }

        try {
            Room newRoom = Room.builder()
                    .name(createRoomRequest.getRoomName())
                    .password(passwordEncoder.encode(createRoomRequest.getRoomPassword()))
                    .isPublic(createRoomRequest.getRoomPassword().isEmpty())
                    .build();

            gameMaster.setCurrentRoom(newRoom);
            newRoom.getParticipants().add(gameMaster);
            newRoom.setGamemaster(gameMaster);

            newRoom = roomRepository.save(newRoom);
            userRepository.save(gameMaster);

            MinimalRoomResponse minimalRoomResponse = MinimalRoomResponse.builder()
                    .playerCount(1L)
                    .roomId(newRoom.getRoomId())
                    .roomName(newRoom.getName())
                    .gameStatus(null)
                    .hasActiveGame(false)
                    .isPublic(newRoom.isPublic())
                    .build();

            RoomCreationResponse successResponse = responseMapper.toRoomCreationResponse(
                    newRoom, gameMaster, true, "");

            simpMessagingTemplate.convertAndSendToUser(
                    gameMaster.getId().toString(),
                    "/queue/room-creation-response",
                    successResponse
            );

            return minimalRoomResponse;

        } catch (Exception e) {
            RoomCreationResponse errorResponse = responseMapper.toRoomCreationResponse(
                    null, gameMaster, false, "");

            simpMessagingTemplate.convertAndSendToUser(
                    gameMaster.getId().toString(),
                    "/queue/room-creation-response",
                    errorResponse
            );

            return null;
        }
    }

    @Override
    @Transactional
    public UserCurrentStatus leaveRoom(LeaveRequest leaveRequest, User user) {


        //cache evict
        Cache cache = cacheManager.getCache("userStatus");
        if (cache != null) {
            cache.evict("userStatus_" + user.getId());
        }

        Room room = roomRepository.findById(leaveRequest.getRoomId())
                .orElseThrow(() -> new RoomNotFoundException("Room not found"));

        if (user.getCurrentRoom() == null || !user.getCurrentRoom().getRoomId().equals(room.getRoomId())) {
            throw new UserNotInRoomException("User is not in this room");
        }

        // Ha a gamemaster lép ki → vége a játéknak
        if (room.getGamemaster() != null && room.getGamemaster().getId().equals(user.getId())) {
            // Szoba lezárása
            room.setActive(false);

            // Minden játékos kiléptetése és státusz frissítése
            for (User participant : room.getParticipants()) {
                participant.setCurrentRoom(null);
                userRepository.save(participant);

                // Frissített státusz elküldése a kliensnek
                UserCurrentStatus updatedStatus = responseMapper.toUserCurrentStatus(participant, true);
                messagingTemplate.convertAndSendToUser(
                        participant.getId().toString(),
                        "/queue/user-status",
                        updatedStatus
                );
            }

            // Résztvevők listájának kiürítése
            room.getParticipants().clear();

            // Mentés
            roomRepository.save(room);

            // Broadcast üzenet, hogy a játék véget ért
            messagingTemplate.convertAndSend("/topic/room/" + room.getRoomId() + "/end",
                    "The game has ended because the gamemaster left.");
        } else {
            // Normál játékos kilépése
            room.getParticipants().remove(user);
            user.setCurrentRoom(null);
            userRepository.save(user);
            roomRepository.save(room);

            simpMessagingTemplate.convertAndSend(
                    "/topic/room/" + room.getRoomId() + "/participant-update",
                    responseMapper.toRoomResponse(room)
            );
        }

        return responseMapper.toUserCurrentStatus(user, true);
    }

    @Override
    @Async
    @Transactional
    public CompletableFuture<CurrentAndManagedRoomResponse> currentRoomAndManagedRoomStatus(CurrentAndManagedRoomRequest currentAndManagedRoomRequest) {
        User user = authenticationService.getAuthenticatedUser();

        RoomResponse currentRoomResponse = null;
        RoomResponse managedRoomResponse = null;

        if (currentAndManagedRoomRequest.getCurrentRoomId() != null) {
            Room currentRoom = roomRepository.findByIdWithParticipants(currentAndManagedRoomRequest.getCurrentRoomId())
                    .orElseThrow(() -> new RoomNotFoundException("Current room not found"));

            if (!currentRoom.getParticipants().contains(user)) {
                throw new AccessDeniedException("User is not a member of the current room");
            }

            currentRoomResponse = responseMapper.toRoomResponse(currentRoom);
        }

        if (currentAndManagedRoomRequest.getManagedRoomId() != null) {
            Room managedRoom = roomRepository.findByRoomIdWithGameMaster(currentAndManagedRoomRequest.getManagedRoomId())
                    .orElseThrow(() -> new RoomNotFoundException("Managed room not found"));

            if (!managedRoom.getGamemaster().equals(user)) {
                throw new AccessDeniedException("User is not the game master for this room");
            }

            managedRoomResponse = responseMapper.toRoomResponse(managedRoom);
        }

        return CompletableFuture.completedFuture(
                CurrentAndManagedRoomResponse.builder()
                        .currentRoom(currentRoomResponse)
                        .managedRoom(managedRoomResponse)
                        .build()
        );
    }


    public Boolean isRoomFull(Room room) {
        Long participantsAndBotCount = roomRepository.countPlayersTotal(room.getRoomId())
                .orElseThrow(() -> new RoomNotFoundException("Room Not Found"));
        return participantsAndBotCount >= 4;
    }

    public void checkPermission(Room room, User gamemaster) {
        if (room.getGamemaster() == null || !(room.getGamemaster().getId().equals(gamemaster.getId()))) {
            throw new AccessDeniedException("User is not the gamemaster");
        }

    }
}
