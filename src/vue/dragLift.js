// The lift of a card that is being dragged is a translation of its body; its cell stays in the slot the layout gives it. The offset is therefore the pointer, less the point of the card
// that was grabbed, less the slot: the same for every pointer move (it must not be built up from the offset of the move before).
export const liftOffset = (x, y, grab, slot) => ({ dx: x - grab.x - slot.left, dy: y - grab.y - slot.top })
