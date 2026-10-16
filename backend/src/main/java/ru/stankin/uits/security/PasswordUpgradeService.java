package ru.stankin.uits.security;

import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsPasswordService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.stankin.uits.module.user.entity.User;
import ru.stankin.uits.module.user.repository.UserRepository;

@Service
@RequiredArgsConstructor
public class PasswordUpgradeService implements UserDetailsPasswordService {

    private final UserRepository userRepository;

    @Override
    @Transactional
    public UserDetails updatePassword(UserDetails user, String newPassword) {
        User managedUser = userRepository.findByUsername(user.getUsername())
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + user.getUsername()));

        managedUser.setPassword(newPassword);

        return new SecurityUser(managedUser);
    }
}
