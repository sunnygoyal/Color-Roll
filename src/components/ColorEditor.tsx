import React, { useState } from 'react';
import { ColorItem } from '../types.ts';
import { PRESET_PALETTES, QUICK_SWATCH_COLORS } from '../data/presets.ts';
import { suggestColorName, normalizeHex, getContrastColor } from '../utils/colors.ts';
import { Plus, Trash2, Volume2, RotateCcw, Play, X, ChevronUp, ChevronDown } from 'lucide-react';

interface ColorEditorProps {
  colors: ColorItem[];
  onUpdateColors: (colors: ColorItem[]) => void;
  onStartGame: () => void;
  onPreviewSpeak: (name: string) => void;
}

export const ColorEditor: React.FC<ColorEditorProps> = ({
  colors,
  onUpdateColors,
  onStartGame,
  onPreviewSpeak,
}) => {
  // Modal overlay state
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [newHex, setNewHex] = useState<string>('#3B82F6');
  const [newName, setNewName] = useState<string>('Blue');

  // Inline editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNameText, setEditNameText] = useState<string>('');

  const openAddModal = () => {
    // Pick an initial swatch that isn't already in the list if possible
    const available = QUICK_SWATCH_COLORS.find(
      (swatch) => !colors.some((c) => c.hex.toLowerCase() === swatch.hex.toLowerCase())
    ) || QUICK_SWATCH_COLORS[0];

    setNewHex(available.hex);
    setNewName(available.name);
    setIsAddModalOpen(true);
  };

  const handleNativeColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const hex = e.target.value;
    setNewHex(hex);
    const suggested = suggestColorName(hex);
    setNewName(suggested);
  };

  const handlePickQuickSwatch = (swatch: { name: string; hex: string }) => {
    setNewHex(swatch.hex);
    setNewName(swatch.name);
  };

  const handleConfirmAddColor = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmedName = newName.trim();
    if (!trimmedName) return;

    const newItem: ColorItem = {
      id: `color-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: trimmedName,
      hex: normalizeHex(newHex),
    };

    onUpdateColors([...colors, newItem]);
    // Close overlay immediately after selecting/adding
    setIsAddModalOpen(false);
  };

  const handleDeleteColor = (id: string) => {
    if (colors.length <= 1) return;
    const updated = colors.filter((c) => c.id !== id);
    onUpdateColors(updated);
  };

  const handleResetToDefault = () => {
    const defaultSix: ColorItem[] = PRESET_PALETTES[0].colors.map((c, i) => ({
      id: `default-${i}-${Date.now()}`,
      name: c.name,
      hex: c.hex,
    }));
    onUpdateColors(defaultSix);
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= colors.length) return;
    const newArr = [...colors];
    const [moved] = newArr.splice(index, 1);
    newArr.splice(targetIndex, 0, moved);
    onUpdateColors(newArr);
  };

  const handleUpdateItemColor = (id: string, newHexValue: string) => {
    const normalized = normalizeHex(newHexValue);
    onUpdateColors(
      colors.map((c) => (c.id === id ? { ...c, hex: normalized } : c))
    );
  };

  const handleSaveInlineName = (id: string) => {
    if (!editNameText.trim()) {
      setEditingId(null);
      return;
    }
    onUpdateColors(
      colors.map((c) => (c.id === id ? { ...c, name: editNameText.trim() } : c))
    );
    setEditingId(null);
  };

  const newContrast = getContrastColor(newHex);

  return (
    <div className="w-full max-w-2xl mx-auto px-4 pt-4 pb-28">
      {/* Selected Color List */}
      <div className="space-y-2.5">
        {colors.map((c, index) => {
          const contrast = getContrastColor(c.hex);
          const isEditing = editingId === c.id;

          return (
            <div
              key={c.id}
              className="bg-slate-900/90 border border-slate-800 hover:border-slate-700/80 rounded-xl p-3 flex items-center justify-between gap-3 transition-colors"
            >
              {/* Color Swatch with inline picker */}
              <div className="relative w-10 h-10 rounded-lg overflow-hidden shrink-0 shadow-sm border border-white/10 group">
                <input
                  type="color"
                  value={c.hex}
                  onChange={(e) => handleUpdateItemColor(c.id, e.target.value)}
                  className="absolute -inset-4 w-20 h-20 opacity-0 cursor-pointer"
                  title="Change this color"
                  aria-label={`Change color for ${c.name}`}
                />
                <div
                  className="w-full h-full flex items-center justify-center"
                  style={{ backgroundColor: c.hex }}
                >
                  <span
                    className={`text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity ${
                      contrast === 'dark' ? 'text-black' : 'text-white'
                    }`}
                  >
                    ✎
                  </span>
                </div>
              </div>

              {/* Color Name & Hex */}
              <div className="flex-1 min-w-0">
                {isEditing ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={editNameText}
                      onChange={(e) => setEditNameText(e.target.value)}
                      onBlur={() => handleSaveInlineName(c.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveInlineName(c.id);
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      autoFocus
                      className="w-full bg-slate-950 border border-blue-500 rounded-lg px-2.5 py-1 text-xs text-white outline-none"
                    />
                    <button
                      onClick={() => handleSaveInlineName(c.id)}
                      className="text-xs bg-blue-600 text-white px-2.5 py-1 rounded-lg cursor-pointer"
                    >
                      Save
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => {
                      setEditingId(c.id);
                      setEditNameText(c.name);
                    }}
                    className="cursor-pointer group flex items-baseline gap-2 truncate"
                    title="Click to rename"
                  >
                    <span className="text-sm font-semibold text-slate-100 group-hover:text-blue-400 truncate">
                      {c.name}
                    </span>
                    <span className="text-[11px] font-mono text-slate-500 uppercase">
                      {c.hex}
                    </span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1 shrink-0">
                {/* Pronounce preview */}
                <button
                  type="button"
                  onClick={() => onPreviewSpeak(c.name)}
                  className="p-1.5 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer rounded-lg hover:bg-slate-800"
                  title={`Speak "${c.name}"`}
                  aria-label={`Pronounce ${c.name}`}
                >
                  <Volume2 className="w-4 h-4" />
                </button>

                {/* Reorder Up/Down */}
                <div className="flex flex-col">
                  <button
                    type="button"
                    onClick={() => handleMove(index, 'up')}
                    disabled={index === 0}
                    className="text-slate-500 hover:text-slate-200 disabled:opacity-20 cursor-pointer p-0.5"
                    title="Move up"
                    aria-label="Move color up"
                  >
                    <ChevronUp className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMove(index, 'down')}
                    disabled={index === colors.length - 1}
                    className="text-slate-500 hover:text-slate-200 disabled:opacity-20 cursor-pointer p-0.5"
                    title="Move down"
                    aria-label="Move color down"
                  >
                    <ChevronDown className="w-3 h-3" />
                  </button>
                </div>

                {/* Delete */}
                <button
                  type="button"
                  onClick={() => handleDeleteColor(c.id)}
                  disabled={colors.length <= 1}
                  className="p-1.5 text-slate-500 hover:text-rose-400 disabled:opacity-20 transition-colors cursor-pointer rounded-lg hover:bg-slate-800"
                  title={`Remove ${c.name}`}
                  aria-label={`Remove ${c.name}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}

        {/* Add Color Button at the end of the list */}
        <button
          type="button"
          onClick={openAddModal}
          className="w-full py-3 px-4 rounded-xl border border-dashed border-slate-700 hover:border-slate-500 bg-slate-900/40 hover:bg-slate-900 text-slate-300 hover:text-white font-medium text-sm flex items-center justify-center gap-2 transition-all cursor-pointer group"
        >
          <div className="w-6 h-6 rounded-lg bg-slate-800 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center transition-colors">
            <Plus className="w-4 h-4" />
          </div>
          <span>Add Color</span>
        </button>
      </div>

      {/* Two Fixed Bottom Buttons */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-md border-t border-slate-800/80 px-4 py-3.5 shadow-2xl">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleResetToDefault}
            className="px-4 py-3 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors flex items-center gap-2 cursor-pointer shrink-0"
            title="Reset to classic 6 colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <button
            type="button"
            onClick={onStartGame}
            disabled={colors.length < 1}
            className="flex-1 py-3 px-6 rounded-xl font-bold text-sm bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/25 transition-all transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-40 disabled:pointer-events-none cursor-pointer flex items-center justify-center gap-2"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Start Game</span>
          </button>
        </div>
      </div>

      {/* Add Color Modal Overlay */}
      {isAddModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setIsAddModalOpen(false)}
        >
          <div
            className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-5 text-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-base text-white">Add Color</h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Swatches inside modal */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">
                Pick a predefined shade
              </label>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_SWATCH_COLORS.map((swatch) => (
                  <button
                    key={swatch.hex}
                    type="button"
                    onClick={() => handlePickQuickSwatch(swatch)}
                    className={`w-7 h-7 rounded-lg transition-transform hover:scale-110 active:scale-95 cursor-pointer relative ${
                      newHex.toLowerCase() === swatch.hex.toLowerCase()
                        ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-105'
                        : 'opacity-85 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: swatch.hex }}
                    title={`${swatch.name} (${swatch.hex})`}
                    aria-label={`Select ${swatch.name}`}
                  />
                ))}
              </div>
            </div>

            {/* Form with native color picker & custom name */}
            <form onSubmit={handleConfirmAddColor} className="space-y-4 pt-1">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400">
                  Custom color & picker
                </label>
                <div className="flex items-center gap-3 bg-slate-950 border border-slate-800 rounded-xl p-2.5">
                  <div className="relative w-11 h-11 rounded-lg overflow-hidden shrink-0 shadow-inner">
                    <input
                      type="color"
                      value={newHex}
                      onChange={handleNativeColorChange}
                      className="absolute -inset-4 w-24 h-24 cursor-pointer opacity-0"
                      id="modal-native-picker"
                      aria-label="Choose custom color"
                    />
                    <div
                      className="w-full h-full flex items-center justify-center font-bold text-xs"
                      style={{ backgroundColor: newHex }}
                    >
                      <div
                        className={`w-2.5 h-2.5 rounded-full ${
                          newContrast === 'dark' ? 'bg-black/60' : 'bg-white/80'
                        }`}
                      />
                    </div>
                  </div>
                  <label
                    htmlFor="modal-native-picker"
                    className="text-xs font-mono text-slate-300 font-medium cursor-pointer uppercase pr-2 hover:text-white"
                  >
                    {newHex} (Click swatch to pick)
                  </label>
                </div>
              </div>

              {/* Name Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400">
                  Color name
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Sunflower Yellow"
                    autoFocus
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none"
                    maxLength={30}
                  />
                  <button
                    type="button"
                    onClick={() => onPreviewSpeak(newName || 'Color')}
                    title="Hear how name is pronounced"
                    className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-colors cursor-pointer shrink-0"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newName.trim()}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white shadow-md transition-all cursor-pointer"
                >
                  Add Color
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
