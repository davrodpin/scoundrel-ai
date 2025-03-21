import { useState, useEffect } from 'react';
import { Box, Button, Container, Paper, Typography, Tooltip, Grid, CircularProgress, Slide, Dialog, DialogContent, TextField } from '@mui/material';
import { useGame } from './hooks/useGame';
import type { GameCard, Monster, Weapon, HealthPotion } from './types/cards';
import { Card } from './components/Card';
import { Leaderboard } from './components/Leaderboard';
import FavoriteIcon from '@mui/icons-material/Favorite';
import HelpIcon from '@mui/icons-material/Help';
import LeaderboardIcon from '@mui/icons-material/Leaderboard';

// Debug logging utility that only logs in development
const debug = {
  log: (...args: any[]) => {
    if (import.meta.env.DEV) {
      console.log(...args);
    }
  }
};

function DeckPile({ count, label, onClick, topCard }: { count: number; label: string; onClick?: () => void; topCard?: GameCard }) {
  const [isHovered, setIsHovered] = useState(false);
  const isClickable = Boolean(onClick);

  return (
    <Box sx={{ textAlign: 'center' }}>
      <Tooltip 
        title={isClickable ? "Click to reveal a new room" : ""}
        arrow
        open={isClickable && isHovered}
      >
        <Box 
          sx={{ 
            position: 'relative', 
            width: 120, 
            height: 180, 
            display: 'inline-block',
            cursor: isClickable ? 'pointer' : 'default',
            '&:hover': isClickable ? {
              transform: 'translateY(-5px)',
              transition: 'all 0.2s ease-in-out'
            } : {},
            animation: isClickable ? 'glow 2s infinite' : 'none',
            '@keyframes glow': {
              '0%': {
                boxShadow: '0 0 5px rgba(255, 215, 0, 0.5)'
              },
              '50%': {
                boxShadow: '0 0 20px rgba(255, 215, 0, 0.8)'
              },
              '100%': {
                boxShadow: '0 0 5px rgba(255, 215, 0, 0.5)'
              }
            }
          }}
          onClick={onClick}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {count > 1 && (
            <>
              <Paper
                sx={{
                  position: 'absolute',
                  width: 120,
                  height: 180,
                  backgroundColor: '#666',
                  top: 4,
                  left: 4,
                  border: '2px solid #444',
                  borderRadius: 1,
                }}
              />
              <Paper
                sx={{
                  position: 'absolute',
                  width: 120,
                  height: 180,
                  backgroundColor: '#666',
                  top: 2,
                  left: 2,
                  border: '2px solid #444',
                  borderRadius: 1,
                }}
              />
            </>
          )}
          {count === 0 ? (
            <Paper
              sx={{
                width: 120,
                height: 180,
                backgroundColor: 'transparent',
                position: 'relative',
                border: '2px dashed #666',
                borderRadius: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Typography color="#666">Empty</Typography>
            </Paper>
          ) : topCard ? (
            <Box sx={{ position: 'relative' }}>
              <Card card={topCard} />
            </Box>
          ) : (
            <Paper
              sx={{
                width: 120,
                height: 180,
                backgroundColor: '#666',
                position: 'relative',
                border: '2px solid #444',
                borderRadius: 1,
                backgroundImage: 'repeating-linear-gradient(45deg, #555 0, #555 2px, #666 2px, #666 8px)',
                transition: 'all 0.2s ease-in-out',
                ...(isClickable && isHovered && {
                  backgroundColor: '#777',
                  backgroundImage: 'repeating-linear-gradient(45deg, #666 0, #666 2px, #777 2px, #777 8px)',
                })
              }}
            />
          )}
        </Box>
      </Tooltip>
      <Typography variant="h6" sx={{ mt: 1 }}>{label}</Typography>
      <Typography>({count} cards)</Typography>
    </Box>
  );
}

function WeaponStack({ weapon, monstersSlain }: { weapon: Weapon; monstersSlain: Monster[] }) {
  return (
    <Box sx={{ position: 'relative', width: 120, minHeight: 180, transform: 'rotate(180deg)' }}>
      {/* Base weapon card */}
      <Box sx={{ position: 'relative' }}>
        <Card card={weapon} />
      </Box>
      
      {/* Stacked monster cards */}
      {monstersSlain.map((monster, index) => (
        <Box
          key={`${monster.suit}-${monster.rank}`}
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            transform: `translateY(-${(index + 1) * 30}px)`,
            width: '100%',
          }}
        >
          <Card card={monster} />
        </Box>
      ))}
    </Box>
  );
}

export default function App() {
  const { state, error, isConnected, actions } = useGame();
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [showRules, setShowRules] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [hasPromptedLeaderboard, setHasPromptedLeaderboard] = useState(false);
  const [gameOverDialogOpen, setGameOverDialogOpen] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [nameError, setNameError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const canDrawRoom = state && !state.gameOver && (state?.room?.length === 0 || state?.room?.length === 1);

  useEffect(() => {
    if (isConnected && !state) {
      debug.log('Connection established, creating new game...');
      actions.createGame();
    }
  }, [isConnected, state, actions]);

  useEffect(() => {
    if (state?.gameOver) {
      setGameOverDialogOpen(true);
    }
  }, [state?.gameOver]);

  const handleGameOverClose = () => {
    setGameOverDialogOpen(false);
    if (!hasPromptedLeaderboard) {
      setShowLeaderboard(true);
      setHasPromptedLeaderboard(true);
    }
  };

  const handleCardClick = (card: GameCard) => {
    if (!state) return;

    switch (card.type) {
      case 'MONSTER':
        if (state.equippedWeapon) {
          const monster = card as Monster;
          const canUseWeapon = state.equippedWeapon.damage >= monster.damage;
          
          if (canUseWeapon) {
            actions.useWeapon(monster);
          } else {
            actions.fightMonster(monster);
          }
        } else {
          actions.fightMonster(card as Monster);
        }
        break;
      
      case 'WEAPON':
        actions.equipWeapon(card as Weapon);
        break;
      
      case 'HEALTH_POTION':
        const potion = card as HealthPotion;
        actions.useHealthPotion(potion);
        break;
    }
  };

  const getMonsterTooltip = (monster: Monster) => {
    if (!state?.equippedWeapon) {
      return "⚠️ You will fight barehanded and take full damage!";
    }
    
    const canUseWeapon = state.equippedWeapon.damage >= monster.damage;
    
    if (!canUseWeapon) {
      return "⚠️ Your weapon is too weak! You will fight barehanded and take full damage!";
    }
    
    return "";
  };

  const handleScoreSubmit = async () => {
    if (!state) return;

    if (!playerName.trim()) {
      setNameError('Name is required');
      return;
    }

    setSubmitted(true);
    setNameError('');

    try {
      await actions.submitScore({
        playerName: playerName.trim(),
        score: state.score
      });
      setPlayerName('');
      setShowLeaderboard(true);
      handleGameOverClose();
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Failed to submit score. Please try again.';
      console.error('Error submitting score:', e);
      setSubmitted(false);
      setNameError(errorMessage);
    }
  };

  if (!isConnected || error) {
    return (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        gap: 2,
        p: 3,
        textAlign: 'center'
      }}>
        {error ? (
          <>
            <Typography color="error" variant="body1" gutterBottom>
              {error}
            </Typography>
            <Button
              variant="contained"
              color="primary"
              onClick={() => window.location.reload()}
              sx={{ mt: 2 }}
            >
              Start New Game
            </Button>
          </>
        ) : (
          <>
            <CircularProgress />
            <Typography variant="body1" color="text.secondary">
              Connecting to game server...
              <br />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Note: The server may take up to 1 minute to start if it hasn't been used recently.
              </Typography>
            </Typography>
          </>
        )}
      </Box>
    );
  }

  if (!state) {
    return (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        gap: 2
      }}>
        <CircularProgress />
        <Typography variant="body2" color="text.secondary">
          Initializing game...
        </Typography>
      </Box>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography variant="h2" component="h1" gutterBottom>
            Scoundrel
          </Typography>
          <Typography variant="h5" sx={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: 1,
            color: 'text.primary',
            mb: 2
          }}>
            <FavoriteIcon sx={{ color: 'error.main' }} /> {state.health}/{state.maxHealth}
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mb: 2 }}>
            <Button
              variant="outlined"
              onClick={() => setShowRules(!showRules)}
              startIcon={<HelpIcon />}
            >
              Rules
            </Button>
            <Button
              variant="outlined"
              onClick={() => setShowLeaderboard(true)}
              startIcon={<LeaderboardIcon />}
            >
              Leaderboard
            </Button>
            {state.gameOver && (
              <Button
                variant="contained"
                color="primary"
                onClick={() => window.location.reload()}
              >
                Play Again
              </Button>
            )}
          </Box>
        </Box>

        {/* Game Layout Container */}
        <Grid container spacing={4}>
          {/* Game Area */}
          <Grid item xs={12}>
            <Box sx={{ mb: 4 }}>
              {/* Decks and Room */}
              <Grid container spacing={2} justifyContent="center" alignItems="flex-start">
                {/* Dungeon Deck */}
                <Grid item>
                  <DeckPile 
                    count={state?.dungeon?.length ?? 0} 
                    label="Dungeon" 
                    onClick={canDrawRoom ? actions.drawRoom : undefined}
                  />
                </Grid>

                {/* Current Room */}
                <Grid item xs={8}>
                  <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'center', 
                    gap: 2, 
                    flexWrap: 'nowrap',
                    minWidth: 'fit-content'
                  }}>
                    {state.room.map((card) => {
                      if (card.type === 'MONSTER') {
                        const monster = card as Monster;
                        const cardKey = `${card.suit}-${card.rank}`;
                        const showFist = !state.equippedWeapon || (
                          state.equippedWeapon && state.equippedWeapon.damage < monster.damage
                        );

                        return (
                          <Box key={cardKey}>
                            <Tooltip 
                              title={getMonsterTooltip(monster)}
                              open={showFist && hoveredCard === cardKey}
                              arrow
                            >
                              <Box 
                                onMouseEnter={() => setHoveredCard(cardKey)}
                                onMouseLeave={() => setHoveredCard(null)}
                              >
                                <Card 
                                  card={monster} 
                                  onClick={() => handleCardClick(monster)}
                                  showFist={showFist}
                                />
                              </Box>
                            </Tooltip>
                          </Box>
                        );
                      }

                      if (card.type === 'HEALTH_POTION') {
                        const cardKey = `${card.suit}-${card.rank}`;
                        const isHealthFull = state.health >= state.maxHealth;

                        return (
                          <Box key={cardKey}>
                            <Tooltip 
                              title={isHealthFull ? "Using this potion will discard it without healing" : ""}
                              open={isHealthFull && hoveredCard === cardKey}
                              arrow
                            >
                              <Box 
                                onMouseEnter={() => setHoveredCard(cardKey)}
                                onMouseLeave={() => setHoveredCard(null)}
                              >
                                <Card 
                                  card={card} 
                                  onClick={() => handleCardClick(card)}
                                />
                              </Box>
                            </Tooltip>
                          </Box>
                        );
                      }

                      return (
                        <Card 
                          key={`${card.suit}-${card.rank}`} 
                          card={card} 
                          onClick={() => handleCardClick(card)} 
                        />
                      );
                    })}
                  </Box>
                </Grid>

                {/* Discard Pile */}
                <Grid item>
                  <DeckPile 
                    count={Array.isArray(state?.discardPile) ? state.discardPile.length : 0} 
                    label="Discard" 
                    topCard={Array.isArray(state?.discardPile) && state.discardPile.length > 0 ? state.discardPile[state.discardPile.length - 1] : undefined}
                  />
                </Grid>
              </Grid>

              {/* Equipped Weapon and Slain Monsters */}
              {state.equippedWeapon && (
                <Box sx={{ 
                  mt: 4, 
                  display: 'flex', 
                  flexDirection: 'column',
                  alignItems: 'center',
                  mb: `${Array.isArray(state.equippedWeapon.monstersSlain) ? state.equippedWeapon.monstersSlain.length * 30 + 20 : 20}px`
                }}>
                  <WeaponStack 
                    weapon={state.equippedWeapon} 
                    monstersSlain={Array.isArray(state.equippedWeapon.monstersSlain) ? state.equippedWeapon.monstersSlain : []} 
                  />
                </Box>
              )}

              {/* Controls */}
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'center', 
                position: 'relative',
                zIndex: 1
              }}>
                <Button
                  variant="outlined"
                  onClick={actions.avoidRoom}
                  disabled={state?.gameOver || !state?.canAvoidRoom || state?.room?.length === 0}
                >
                  Avoid Room
                </Button>
              </Box>
            </Box>
          </Grid>
        </Grid>

        {/* Rules Panel */}
        <Slide direction="left" in={showRules} mountOnEnter unmountOnExit>
          <Paper 
            elevation={6}
            sx={{ 
              position: 'fixed',
              top: 80,
              right: 20,
              width: 300,
              p: 3,
              backgroundColor: 'rgba(0, 0, 0, 0.9)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 2,
              zIndex: 1100
            }}
          >
            <Typography variant="h6" gutterBottom>Game Rules</Typography>
            
            <Typography variant="subtitle2" sx={{ mt: 2, color: 'primary.main' }}>
              Setup & Goal
            </Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>
              • Start with 20 health points<br />
              • Explore dungeon rooms<br />
              • Survive and score points
            </Typography>

            <Typography variant="subtitle2" sx={{ mt: 2, color: 'primary.main' }}>
              Room Mechanics
            </Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>
              • Draw 4 cards per room<br />
              • Handle 3-4 cards before revealing a new room<br />
              • Can avoid many rooms, but not<br />
              &nbsp;&nbsp;two in a row
            </Typography>

            <Typography variant="subtitle2" sx={{ mt: 2, color: 'primary.main' }}>
              Card Types
            </Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>
              • ♣/♠ Monsters: Click to fight<br />
              • ♦ Weapons: Click to equip<br />
              • ♥ Potions:<br />
              &nbsp;&nbsp;- Click to restore health<br />
              &nbsp;&nbsp;- Health can't exceed 20
            </Typography>

            <Typography variant="subtitle2" sx={{ mt: 2, color: 'primary.main' }}>
              Combat Rules
            </Typography>
            <Typography variant="body2">
              • No weapon: Take full damage<br />
              • With weapon:<br />
              &nbsp;&nbsp;- Must have power {'>'} monster<br />
              &nbsp;&nbsp;- Weapon power becomes<br />
              &nbsp;&nbsp;&nbsp;&nbsp;monster's after victory<br />
              • Die at 0 health
            </Typography>
          </Paper>
        </Slide>

        {/* Game Over message */}
        <Dialog 
          open={gameOverDialogOpen} 
          maxWidth="sm"
          fullWidth
          onClose={handleGameOverClose}
          sx={{
            '& .MuiDialog-paper': {
              backgroundColor: 'rgba(0, 0, 0, 0.9)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 2,
              textAlign: 'center',
              p: 3
            }
          }}
        >
          <DialogContent>
            <Typography variant="h3" color={state?.health > 0 ? 'success.main' : 'error.main'} gutterBottom>
              Game Over!
            </Typography>
            <Typography variant="h4" gutterBottom>
              Final Score: {state?.score}
            </Typography>
            <Box sx={{ mt: 3, mb: 3 }}>
              <TextField
                label="Enter your name for the leaderboard"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                error={!!nameError}
                helperText={nameError}
                size="medium"
                fullWidth
                autoFocus
                sx={{ mb: 2 }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleScoreSubmit();
                  }
                }}
              />
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleScoreSubmit}
                  disabled={submitted}
                >
                  {submitted ? 'Score Submitted!' : 'Submit Score'}
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => window.location.reload()}
                >
                  Play Again
                </Button>
              </Box>
            </Box>
          </DialogContent>
        </Dialog>

        <Leaderboard
          open={showLeaderboard}
          onClose={() => setShowLeaderboard(false)}
          currentScore={state?.score || 0}
          gameOver={state?.gameOver || false}
        />
      </Box>

      {/* Copyright Footer */}
      <Box sx={{ 
        mt: 4, 
        textAlign: 'center', 
        borderTop: '1px solid rgba(255, 255, 255, 0.12)',
        pt: 2
      }}>
        <Typography variant="body2" color="text.secondary">
          <a 
            href="http://www.stfj.net/art/2011/Scoundrel.pdf" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{
              color: '#90caf9',
              textDecoration: 'none',
              transition: 'color 0.2s ease-in-out'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#bbdefb'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#90caf9'}
          >Game rules</a> © 2011 Zach Gage & Kurt Bieg
        </Typography>
      </Box>
    </Container>
  );
}