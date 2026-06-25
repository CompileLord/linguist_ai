import os
import json
import uuid
from typing import Optional, Dict
from app.models.user_gamification import UserGamification
from app.repositories.interfaces.gamification import AbstractGamificationRepository

class GameLevelProgressionService:
    def __init__(self, gamification_repo: AbstractGamificationRepository) -> None:
        self.gamification_repo = gamification_repo
        self.thresholds = self._load_thresholds()

    def _load_thresholds(self) -> Dict[str, int]:
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        path = os.path.join(base_dir, "app", "core", "level_thresholds.json")
        with open(path, "r") as f:
            return json.load(f)

    async def check_and_apply_level_up(self, user_id: uuid.UUID) -> UserGamification:
        gamification = await self.gamification_repo.get_by_user_id(user_id)
        current_lvl = gamification.current_game_level
        total_xp = gamification.total_xp
        
        new_lvl = current_lvl
        for lvl_str, threshold in self.thresholds.items():
            lvl = int(lvl_str)
            if total_xp >= threshold:
                new_lvl = max(new_lvl, lvl)
                
        if new_lvl > current_lvl:
            return await self.gamification_repo.update_level(user_id, new_lvl)
        return gamification

    def get_progress(self, gamification: UserGamification) -> dict:
        current_lvl = gamification.current_game_level
        total_xp = gamification.total_xp
        
        next_lvl = current_lvl + 1
        next_lvl_str = str(next_lvl)
        
        if next_lvl_str in self.thresholds:
            xp_for_next = self.thresholds[next_lvl_str]
        else:
            xp_for_next = self.thresholds[str(current_lvl)]
            
        current_lvl_threshold = self.thresholds.get(str(current_lvl), 0)
        
        xp_in_level = total_xp - current_lvl_threshold
        xp_needed_in_level = xp_for_next - current_lvl_threshold
        
        if xp_needed_in_level > 0:
            percentage = min(100.0, max(0.0, (xp_in_level / xp_needed_in_level) * 100.0))
        else:
            percentage = 100.0
            
        xp_remaining = max(0, xp_for_next - total_xp)
        
        return {
            "current_level": current_lvl,
            "current_xp": total_xp,
            "xp_for_next_level": xp_for_next,
            "xp_remaining": xp_remaining,
            "progress_percentage": percentage
        }
