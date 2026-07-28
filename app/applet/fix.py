path = 'src/components/WorldDetail.tsx'
with open(path, 'r', encoding='utf-8') as f:
    text = f.read()

import re

match = re.search(r"\{costruiscoFlowStage === 'game' \? \([\s\S]*?</div>\s*</div>", text)
if match:
    old_str = match.group(0)
    print("Found old string of length", len(old_str))
    
    new_str = """{costruiscoFlowStage === 'game' ? (
                   costruiscoGameCompleted ? (
                     <button
                       onClick={() => {
                         sound.playClick();
                         completeCostruiscoExercise();
                       }}
                       className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md cursor-pointer transition-colors"
                     >
                       Continua
                     </button>
                   ) : (
                     <ActionGrid columns={2}>
                       <button
                         onClick={() => {
                           sound.playClick();
                           cancelCostruiscoExercise();
                         }}
                         className="w-full py-3 rounded-2xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-sm shadow-md cursor-pointer transition-colors"
                       >
                         Annulla
                       </button>
                       <button
                         onClick={() => {
                           sound.playClick();
                           if (!costruiscoGameCompleted) return;
                           completeCostruiscoExercise();
                         }}
                         disabled={!costruiscoGameCompleted}
                         className={`w-full py-3 rounded-2xl text-white font-bold text-sm shadow-md transition-colors ${
                           costruiscoGameCompleted
                             ? 'bg-emerald-600 hover:bg-emerald-700 cursor-pointer'
                             : 'bg-emerald-300 cursor-not-allowed opacity-70'
                         }`}
                       >
                         Continua
                       </button>
                     </ActionGrid>
                   )
                 ) : (
                   <button
                     onClick={() => {
                       sound.playClick();
                       setCostruiscoFlowStage('game');
                     }}
                     className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md cursor-pointer transition-colors"
                   >
                     Continua
                   </button>
                 )}"""
                 
    text = text.replace(old_str, new_str)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(text)
    print("Successfully replaced costruisco footer!")
else:
    print("Match not found!")
