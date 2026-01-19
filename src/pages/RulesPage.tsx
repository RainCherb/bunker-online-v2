import { motion } from 'framer-motion';
import { Shield, ArrowLeft, Users, Clock, Vote, Award, BookOpen, Target, MessageSquare, Skull } from 'lucide-react';
import { Link } from 'react-router-dom';

const RulesPage = () => {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 radiation-gradient opacity-20" />
      <div className="absolute inset-0 scanline pointer-events-none opacity-30" />

      <div className="relative z-10 container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 mb-12"
        >
          <Link
            to="/"
            className="p-3 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-primary" />
            <span className="font-display text-xl tracking-wider text-primary">БУНКЕР 3.2</span>
          </div>
        </motion.header>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center mb-12"
        >
          <h1 className="font-display text-4xl md:text-5xl text-primary text-glow mb-4">
            ПРАВИЛА ИГРЫ
          </h1>
          <p className="text-lg text-muted-foreground">
            Изучите правила и станьте выжившим
          </p>
        </motion.div>

        {/* Rules Sections */}
        <div className="space-y-8">
          {/* Story */}
          <RuleSection
            icon={<BookOpen className="w-6 h-6" />}
            title="История"
            delay={0.1}
          >
            <p>
              На земле вот-вот произойдет катастрофа! Группа выживших собралась у бункера — 
              единственного шанса спастись. Но мест на всех не хватит. Вам предстоит доказать, 
              что именно вы достойны попасть внутрь.
            </p>
          </RuleSection>

          {/* Players */}
          <RuleSection
            icon={<Users className="w-6 h-6" />}
            title="Количество игроков"
            delay={0.2}
          >
            <p className="mb-4">
              В игре могут участвовать от 6 до 15 игроков. Половина из них попадёт в бункер, 
              остальные будут изгнаны.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="py-2 px-3 text-left font-display">Игроков</th>
                    <th className="py-2 px-3 text-left font-display">Мест в бункере</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  <tr className="border-b border-border/50">
                    <td className="py-2 px-3">6-7</td>
                    <td className="py-2 px-3 text-primary">3</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-2 px-3">8-9</td>
                    <td className="py-2 px-3 text-primary">4</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-2 px-3">10-11</td>
                    <td className="py-2 px-3 text-primary">5</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-2 px-3">12-13</td>
                    <td className="py-2 px-3 text-primary">6</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3">14-15</td>
                    <td className="py-2 px-3 text-primary">7</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </RuleSection>

          {/* Character */}
          <RuleSection
            icon={<Target className="w-6 h-6" />}
            title="Ваш персонаж"
            delay={0.3}
          >
            <p className="mb-4">
              Каждый игрок получает уникального персонажа со случайными характеристиками:
            </p>
            <ul className="space-y-2 text-muted-foreground">
              {[
                'Пол и возраст',
                'Телосложение',
                'Черта характера',
                'Профессия',
                'Состояние здоровья',
                'Хобби / Увлечение',
                'Фобия / Страх',
                'Крупный инвентарь',
                'Рюкзак',
                'Дополнительное сведение',
                'Специальная способность',
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  {item}
                </li>
              ))}
            </ul>
          </RuleSection>

          {/* Rounds */}
          <RuleSection
            icon={<Clock className="w-6 h-6" />}
            title="Раунды игры"
            delay={0.4}
          >
            <p className="mb-4">
              Игра состоит из нескольких раундов. В первом раунде все раскрывают профессию. 
              В последующих раундах игроки раскрывают дополнительные характеристики.
            </p>
            <div className="p-4 rounded-lg bg-secondary/10 border border-secondary/30">
              <p className="text-secondary font-display text-sm">
                Количество характеристик для раскрытия зависит от числа игроков и текущего раунда.
              </p>
            </div>
          </RuleSection>

          {/* Your Turn */}
          <RuleSection
            icon={<MessageSquare className="w-6 h-6" />}
            title="Ваш ход"
            delay={0.5}
          >
            <p>
              Когда приходит ваша очередь, у вас есть 1 минута чтобы представить своего персонажа. 
              Делайте игру интересной — включайте фантазию и расскажите историю! Не просто 
              зачитывайте характеристики, а убедите всех в своей ценности для выживания.
            </p>
          </RuleSection>

          {/* Discussion */}
          <RuleSection
            icon={<Users className="w-6 h-6" />}
            title="Обсуждение"
            delay={0.6}
          >
            <p>
              После ходов всех игроков начинается общее обсуждение — 1 минута для всех. 
              Обсуждайте, спорьте, объединяйтесь в альянсы, но помните — места хватит не всем!
            </p>
          </RuleSection>

          {/* Voting */}
          <RuleSection
            icon={<Vote className="w-6 h-6" />}
            title="Голосование"
            delay={0.7}
          >
            <p className="mb-4">
              В конце каждого раунда проводится голосование за изгнание одного игрока:
            </p>
            <ul className="space-y-3 text-muted-foreground">
              <li className="flex items-start gap-3">
                <Skull className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
                <span>Игрок с 70%+ голосов изгоняется немедленно</span>
              </li>
              <li className="flex items-start gap-3">
                <MessageSquare className="w-5 h-5 text-secondary mt-0.5 flex-shrink-0" />
                <span>При меньшем количестве голосов — 30 секунд на оправдание</span>
              </li>
              <li className="flex items-start gap-3">
                <Vote className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <span>При равенстве голосов — повторное голосование</span>
              </li>
            </ul>
            <div className="mt-4 p-4 rounded-lg bg-destructive/10 border border-destructive/30">
              <p className="text-destructive font-display text-sm">
                Важно: Во время оправдания нельзя раскрывать свои характеристики!
              </p>
            </div>
          </RuleSection>

          {/* Victory */}
          <RuleSection
            icon={<Award className="w-6 h-6" />}
            title="Победа"
            delay={0.8}
          >
            <p>
              Игра заканчивается, когда в лагере остаётся нужное количество игроков для заполнения 
              бункера. Те, кто попал внутрь — победители! Остальные остаются снаружи и погибают 
              от катастрофы.
            </p>
          </RuleSection>
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          className="mt-16 text-center"
        >
          <Link to="/" className="bunker-button inline-flex items-center gap-3">
            <Shield className="w-5 h-5" />
            НАЧАТЬ ИГРУ
          </Link>
        </motion.div>
      </div>
    </div>
  );
};

interface RuleSectionProps {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  delay: number;
}

const RuleSection = ({ icon, title, children, delay }: RuleSectionProps) => (
  <motion.section
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="bunker-card"
  >
    <div className="flex items-center gap-3 mb-4">
      <div className="text-primary">{icon}</div>
      <h2 className="font-display text-xl text-primary">{title}</h2>
    </div>
    <div className="text-foreground leading-relaxed">
      {children}
    </div>
  </motion.section>
);

export default RulesPage;
