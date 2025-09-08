import React, { useState, useEffect } from 'react';
import './Games.css';

const Games = () => {
  const [currentGame, setCurrentGame] = useState('menu');
  const [selectedCard, setSelectedCard] = useState(null);

  // Game data matching the design
  const games = [
    {
      id: 'memory-matching',
      title: 'Memory Matching',
      description: 'Flip cards to find matching pairs from your personal photo collection',
      icon: '📚',
      gradient: 'memory-matching-gradient',
      buttonText: 'Play Now',
      buttonClass: 'play-now-btn'
    },
    {
      id: 'life-event-quiz',
      title: 'Life Event Quiz',
      description: 'Answer questions about your life experiences and special moments',
      icon: '❓',
      gradient: 'life-event-gradient',
      buttonText: 'Start Quiz',
      buttonClass: 'start-quiz-btn'
    },
    {
      id: 'guess-song',
      title: 'Guess the Song',
      description: 'Listen to familiar tunes and guess the song from your favorite era',
      icon: '🎵',
      gradient: 'guess-song-gradient',
      buttonText: 'Listen & Play',
      buttonClass: 'listen-play-btn'
    },
    {
      id: 'spot-difference',
      title: 'Spot the Difference',
      description: 'Find subtle differences between two similar family photos',
      icon: '🔍',
      gradient: 'spot-difference-gradient',
      buttonText: 'Find Differences',
      buttonClass: 'find-differences-btn'
    },
    {
      id: 'sequence-recall',
      title: 'Sequence Recall',
      description: 'Arrange photos in the correct order to recreate your timeline',
      icon: '📋',
      gradient: 'sequence-recall-gradient',
      buttonText: 'Arrange Photos',
      buttonClass: 'arrange-photos-btn'
    },
    {
      id: 'voice-memory',
      title: 'Voice Memory',
      description: 'Listen to familiar voices and match them with family members',
      icon: '🎤',
      gradient: 'voice-memory-gradient',
      buttonText: 'Listen & Match',
      buttonClass: 'listen-match-btn'
    }
  ];

  const accessibilityFeatures = [
    {
      icon: 'TT',
      title: 'Large Text',
      description: 'Easy-read fonts and adjustable text size',
      color: '#8B5CF6'
    },
    {
      icon: '🔊',
      title: 'Voice Over',
      description: 'Audio instructions and feedback for all games',
      color: '#EC4899'
    },
    {
      icon: '👆',
      title: 'Touch Friendly',
      description: 'Large buttons designed for easy interaction',
      color: '#10B981'
    },
    {
      icon: '⏰',
      title: 'No Time Pressure',
      description: 'Play at your own pace without time limits',
      color: '#F59E0B'
    }
  ];

  const GameMenu = () => (
    <div className="games-page">
      <div className="games-container">
        <header className="games-header">
          <h1>Choose Your Game</h1>
          <p>Select a game that brings back wonderful memories</p>
        </header>

        <div className="games-grid">
          {games.map((game, index) => (
            <div
              key={game.id}
              className={`game-card ${game.gradient} ${selectedCard === index ? 'selected' : ''}`}
              onClick={() => {
                setSelectedCard(index);
                setTimeout(() => setCurrentGame(game.id), 300);
              }}
            >
              <div className="game-card-content">
                <div className="game-icon">
                  {game.icon}
                </div>
                <div className="game-info">
                  <h3>{game.title}</h3>
                  <p>{game.description}</p>
                  <button className={`game-btn ${game.buttonClass}`}>
                    {game.buttonText}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <section className="accessibility-section">
          <h2>Designed for Everyone</h2>
          <p>Accessibility features to ensure comfortable gameplay</p>
          
          <div className="accessibility-grid">
            {accessibilityFeatures.map((feature, index) => (
              <div key={index} className="accessibility-card">
                <div 
                  className="accessibility-icon" 
                  style={{ backgroundColor: feature.color }}
                >
                  {feature.icon}
                </div>
                <h4>{feature.title}</h4>
                <p>{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="explore-section">
          <h2>Ready to explore more?</h2>
          <div className="explore-buttons">
            <button className="back-home-btn">
              <span className="btn-icon">🏠</span>
              Back to Home
            </button>
            <button className="view-memories-btn">
              <span className="btn-icon">📸</span>
              View Memories
            </button>
          </div>
        </section>
      </div>
    </div>
  );

  const MemoryMatching = () => {
    const [cards, setCards] = useState([]);
    const [flipped, setFlipped] = useState([]);
    const [matched, setMatched] = useState([]);
    const [moves, setMoves] = useState(0);
    
    const images = ['🏠', '👴', '👵', '🎂', '🎓', '💒', '👶', '🌳'];

    useEffect(() => {
      const shuffledCards = [...images, ...images]
        .sort(() => Math.random() - 0.5)
        .map((symbol, index) => ({ id: index, symbol }));
      setCards(shuffledCards);
    }, []);

    const handleCardClick = (id) => {
      if (flipped.length === 2 || flipped.includes(id) || matched.includes(id)) return;
      
      const newFlipped = [...flipped, id];
      setFlipped(newFlipped);

      if (newFlipped.length === 2) {
        setMoves(moves + 1);
        const [first, second] = newFlipped;
        if (cards[first].symbol === cards[second].symbol) {
          setTimeout(() => {
            setMatched([...matched, first, second]);
            setFlipped([]);
          }, 1000);
        } else {
          setTimeout(() => setFlipped([]), 1000);
        }
      }
    };

    const resetGame = () => {
      setCards([]);
      setFlipped([]);
      setMatched([]);
      setMoves(0);
      const shuffledCards = [...images, ...images]
        .sort(() => Math.random() - 0.5)
        .map((symbol, index) => ({ id: index, symbol }));
      setCards(shuffledCards);
    };

    return (
      <div className="game-screen">
        <div className="game-header">
          <button 
            className="back-btn" 
            onClick={() => setCurrentGame('menu')}
          >
            ← Back to Games
          </button>
          <h2>Memory Matching</h2>
        </div>

        <div className="game-content">
          <div className="game-instruction">
            Flip cards to find matching pairs. Take your time and enjoy the memories!
          </div>

          <div className="memory-grid">
            {cards.map((card) => (
              <div
                key={card.id}
                className={`memory-card ${
                  flipped.includes(card.id) || matched.includes(card.id) ? 'flipped' : ''
                }`}
                onClick={() => handleCardClick(card.id)}
              >
                <div className="card-front">?</div>
                <div className="card-back">
                  {card.symbol}
                </div>
              </div>
            ))}
          </div>

          <div className="game-stats">
            <div className="stat">
              <span className="stat-label">Pairs Found:</span>
              <span className="stat-value">{matched.length / 2}/{images.length}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Moves:</span>
              <span className="stat-value">{moves}</span>
            </div>
          </div>

          {matched.length === images.length * 2 && (
            <div className="success-message">
              <h3>Congratulations! 🎉</h3>
              <p>You found all the pairs in {moves} moves!</p>
              <button className="play-again-btn" onClick={resetGame}>
                Play Again
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Simple placeholder for other games
  const GamePlaceholder = ({ gameTitle }) => (
    <div className="game-screen">
      <div className="game-header">
        <button 
          className="back-btn" 
          onClick={() => setCurrentGame('menu')}
        >
          ← Back to Games
        </button>
        <h2>{gameTitle}</h2>
      </div>
      
      <div className="game-content">
        <div className="coming-soon">
          <h3>Coming Soon!</h3>
          <p>This game is being prepared for you.</p>
          <button 
            className="back-to-games-btn"
            onClick={() => setCurrentGame('menu')}
          >
            Choose Another Game
          </button>
        </div>
      </div>
    </div>
  );

  // Render appropriate component
  if (currentGame === 'menu') {
    return <GameMenu />;
  } else if (currentGame === 'memory-matching') {
    return <MemoryMatching />;
  } else {
    const gameData = games.find(g => g.id === currentGame);
    return <GamePlaceholder gameTitle={gameData?.title || 'Game'} />;
  }
};

export default Games;