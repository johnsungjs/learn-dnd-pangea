// @flow
import React, { useState, useLayoutEffect, useRef } from "react";
import { FixedSizeList, areEqual } from "react-window";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import "./style.css";
import getInitialData from "./get-initial-data";
import { reorderList } from "./reorder";
import { initialCanvas, initialSideCanvas } from "./initialData";
import { getRandomId } from "./utils";

function getStyle({ draggableStyle, virtualStyle, isDragging }) {
  // If you don't want any spacing between your items
  // then you could just return this.
  // I do a little bit of magic to have some nice visual space
  // between the row items
  const combined = {
    ...virtualStyle,
    ...draggableStyle,
  };

  // Being lazy: this is defined in our css file
  const grid = 8;

  // when dragging we want to use the draggable style for placement, otherwise use the virtual style
  const result = {
    ...combined,
    height: isDragging ? combined.height : combined.height - grid,
    left: isDragging ? combined.left : combined.left + grid,
    width: isDragging
      ? draggableStyle.width
      : `calc(${combined.width} - ${grid * 2}px)`,
    marginBottom: grid,
  };

  return result;
}

function Item({ provided, item, style, isDragging }) {
  return (
    <div
      {...provided.draggableProps}
      {...provided.dragHandleProps}
      ref={provided.innerRef}
      style={getStyle({
        draggableStyle: provided.draggableProps.style,
        virtualStyle: style,
        isDragging,
      })}
      className={`item ${isDragging ? "is-dragging" : ""}`}
    >
      {item.text}
    </div>
  );
}

// Recommended react-window performance optimisation: memoize the row render function
// Things are still pretty fast without this, but I am a sucker for making things faster
const Row = React.memo(function Row(props) {
  const { data: items, index, style } = props;
  const item = items[index];

  // We are rendering an extra item for the placeholder
  if (!item) {
    return null;
  }

  return (
    <Draggable draggableId={item.id} index={index} key={item.id}>
      {(provided) => <Item provided={provided} item={item} style={style} />}
    </Draggable>
  );
}, areEqual);

const ItemListStatic = React.memo(function ItemList({ column, index }) {
  // There is an issue I have noticed with react-window that when reordered
  // react-window sets the scroll back to 0 but does not update the UI
  // I should raise an issue for this.
  // As a work around I am resetting the scroll to 0
  // on any list that changes it's index
  const listRef = useRef();
  // useLayoutEffect(() => {
  //   const list = listRef.current;
  //   if (list) {
  //     list.scrollTo(0);
  //   }
  // }, [index]);

  return (
    <Droppable
      isDropDisabled={true}
      isCombineEnabled={false}
      ignoreContainerClipping={false}
      droppableId={column.id}
      mode="virtual"
      renderClone={(provided, snapshot, rubric) => (
        <Item
          provided={provided}
          isDragging={snapshot.isDragging}
          item={column.items[rubric.source.index]}
        />
      )}
    >
      {(provided, snapshot) => {
        // Add an extra item to our list to make space for a dragging item
        // Usually the DroppableProvided.placeholder does this, but that won't
        // work in a virtual list
        const itemCount = snapshot.isUsingPlaceholder
          ? column.items.length + 1
          : column.items.length;

        return (
          <FixedSizeList
            height={500}
            itemCount={itemCount}
            itemSize={80}
            width={300}
            outerRef={provided.innerRef}
            itemData={column.items}
            className="task-list"
            ref={listRef}
          >
            {Row}
          </FixedSizeList>
        );
      }}
    </Droppable>
  );
});
const ItemList = React.memo(function ItemList({ column, index }) {
  // There is an issue I have noticed with react-window that when reordered
  // react-window sets the scroll back to 0 but does not update the UI
  // I should raise an issue for this.
  // As a work around I am resetting the scroll to 0
  // on any list that changes it's index
  const listRef = useRef();
  useLayoutEffect(() => {
    const list = listRef.current;
    if (list) {
      list.scrollTo(0);
    }
  }, [index]);

  return (
    <Droppable
      isDropDisabled={false}
      isCombineEnabled={true}
      ignoreContainerClipping={false}
      droppableId={column.id}
      mode="virtual"
      renderClone={(provided, snapshot, rubric) => (
        <Item
          provided={provided}
          isDragging={snapshot.isDragging}
          item={column.items[rubric.source.index]}
        />
      )}
    >
      {(provided, snapshot) => {
        // Add an extra item to our list to make space for a dragging item
        // Usually the DroppableProvided.placeholder does this, but that won't
        // work in a virtual list
        const itemCount = snapshot.isUsingPlaceholder
          ? column.items.length + 1
          : column.items.length;

        return (
          <FixedSizeList
            height={500}
            itemCount={itemCount}
            itemSize={80}
            width={300}
            outerRef={provided.innerRef}
            itemData={column.items}
            className="task-list"
            ref={listRef}
          >
            {Row}
          </FixedSizeList>
        );
      }}
    </Droppable>
  );
});

export default function App() {
  const [state, setState] = useState(initialCanvas);
  console.log("state", state);

  function onDragEnd(result) {
    console.log("result: ", result);
    if (!result.destination) {
      console.log("outside droppable, do nothing");
      return;
    }

    if (result.destination.droppableId === "web-component") {
      console.log("segala yg di drop ke web-component, do nothing");
      return;
    }

    if (result.source.droppableId === "web-component") {
      if (result.source.droppableId === result.destination.droppableId) {
        console.log("do nothing");
        return;
      } else {
        console.log("nah handle ini pindahin kedalem canvas");
        // moving between lists
        const sourceIndex = result.source.index;
        const destinationIdx = result.destination.index;

        const newStateItems = [...state.items];

        newStateItems.splice(destinationIdx, 0, {
          id: getRandomId(),
          text: initialSideCanvas.items[sourceIndex].text,
        });

        const newState = {
          id: "canvas",
          items: newStateItems,
          title: "Canvas",
        };

        console.log("newState", newState);

        setState(newState);
        return;
      }
    } else {
      console.log("ini logic atur urutan droppable dalem canvas");
      const sourceIndex = result.source.index;
      const destinationIdx = result.destination.index;
      if (sourceIndex === destinationIdx) {
        console.log("gausah ngapa ngapain ini sama aja");
        return;
      }

      const newStateItems = [...state.items];
      const [removed] = newStateItems.splice(sourceIndex, 1);
      newStateItems.splice(destinationIdx, 0, removed);

      //swap TODO: ini salah ya jangan di swap tapi harus diurut ulang arraynya

      const newState = {
        id: "canvas",
        items: newStateItems,
        title: "Canvas",
      };

      console.log("newState", newState);

      setState(newState);
      return;
    }
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div style={{ display: "flex", width: "100%", gap: "25px" }}>
        <Droppable
          droppableId="side"
          direction="horizontal"
          type="side"
          isDropDisabled={true}
          isCombineEnabled={false}
          ignoreContainerClipping={false}
        >
          {(provided) => (
            <div
              style={{ border: "5px solid pink" }}
              {...provided.droppableProps}
              ref={provided.innerRef}
            >
              <Draggable draggableId={initialSideCanvas.id} index={0}>
                {(provided) => (
                  <div {...provided.dragHandleProps} ref={provided.innerRef}>
                    <h1 className="column-title" {...provided.dragHandleProps}>
                      {initialSideCanvas.title}
                    </h1>
                    <ItemListStatic column={initialSideCanvas} index={0} />
                    {provided.placeholder}
                  </div>
                )}
              </Draggable>
              {provided.placeholder}
            </div>
          )}
        </Droppable>
        <Droppable
          droppableId="side2"
          direction="horizontal"
          type="side2"
          isDropDisabled={false}
          isCombineEnabled={false}
          ignoreContainerClipping={false}
        >
          {(provided) => (
            <div
              style={{ border: "5px solid white" }}
              className="columns2"
              {...provided.droppableProps}
              ref={provided.innerRef}
            >
              <Draggable draggableId={state.id} index={1}>
                {(provided) => (
                  <div
                    className="column2"
                    {...provided.dragHandleProps}
                    ref={provided.innerRef}
                  >
                    <h1 className="column-title" {...provided.dragHandleProps}>
                      {state.title}
                    </h1>
                    <ItemList column={state} index={1} />
                  </div>
                )}
              </Draggable>
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </div>
    </DragDropContext>
  );
}
